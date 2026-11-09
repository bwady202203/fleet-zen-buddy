import * as XLSX from 'xlsx';

export interface DailyMovement { date: string; debit: number; credit: number }
export interface StatementColumns { date: number; debit: number; credit: number }

export function normalizeStatementText(value: unknown): string {
  return String(value ?? '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
}

export function statementAmount(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '' || value === '-') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = normalizeStatementText(value).replace(/٬|,/g, '').replace(/٫/g, '.')
    .replace(/SAR|ر\.س|ريال/gi, '').replace(/\s/g, '');
  const number = Number(text.replace(/^\((.*)\)$/, '-$1'));
  return Number.isFinite(number) ? number : null;
}

export function statementDate(value: unknown): string | null {
  let year: number, month: number, day: number;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    year = date.y; month = date.m; day = date.d;
  } else if (value instanceof Date) {
    year = value.getFullYear(); month = value.getMonth() + 1; day = value.getDate();
  } else {
    const text = normalizeStatementText(value);
    const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[ T])/);
    const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:$|\s)/);
    if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); }
    else if (local) { year = Number(local[3]); month = Number(local[2]); day = Number(local[1]); }
    else return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function detectStatementColumns(row: unknown[]): StatementColumns {
  const headers = row.map(v => normalizeStatementText(v).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه'));
  const find = (names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));
  return {
    date: find(['تاريخ', 'date']),
    debit: find(['مدين', 'خصم', 'سحب', 'debit', 'withdrawal']),
    credit: find(['دائن', 'ايداع', 'credit', 'deposit']),
  };
}

export function parseStatementRows(rows: unknown[][], columns: StatementColumns, start: number) {
  const movements: DailyMovement[] = [];
  const rejected: number[] = [];
  rows.slice(start).forEach((row, offset) => {
    if (row.every(v => String(v ?? '').trim() === '')) return;
    const date = statementDate(row[columns.date]);
    const debit = statementAmount(row[columns.debit]);
    const credit = statementAmount(row[columns.credit]);
    if (!date || debit === null || credit === null || debit < 0 || credit < 0) {
      rejected.push(start + offset + 1); return;
    }
    movements.push({ date, debit, credit });
  });
  return { movements, rejected };
}

const cents = (number: number) => Math.round(number * 100);

export function aggregateDailyMovements(lines: DailyMovement[], swap = false): Map<string, DailyMovement> {
  const map = new Map<string, DailyMovement>();
  for (const line of lines) {
    const previous = map.get(line.date) ?? { date: line.date, debit: 0, credit: 0 };
    map.set(line.date, {
      date: line.date,
      debit: (cents(previous.debit) + cents(swap ? line.credit : line.debit)) / 100,
      credit: (cents(previous.credit) + cents(swap ? line.debit : line.credit)) / 100,
    });
  }
  return map;
}

export function compareMonthlyMovements(month: string, current: DailyMovement[], bank: DailyMovement[], swap = false) {
  const [year, monthNumber] = month.split('-').map(Number);
  const count = new Date(year, monthNumber, 0).getDate();
  const currentMap = aggregateDailyMovements(current);
  const bankMap = aggregateDailyMovements(bank, swap);
  return Array.from({ length: count }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const system = currentMap.get(date) ?? { date, debit: 0, credit: 0 };
    const statement = bankMap.get(date) ?? { date, debit: 0, credit: 0 };
    const debitDifference = (cents(statement.debit) - cents(system.debit)) / 100;
    const creditDifference = (cents(statement.credit) - cents(system.credit)) / 100;
    return { ...system, bankDebit: statement.debit, bankCredit: statement.credit, debitDifference, creditDifference,
      matches: debitDifference === 0 && creditDifference === 0 };
  });
}