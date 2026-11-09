import { describe, expect, test } from 'bun:test';
import { statementAmount, statementDate, parseStatementRows, detectStatementColumns, compareMonthlyMovements } from './monthlyBankComparison';

describe('monthly bank comparison', () => {
  test('combines every debit and credit for the same day independently', () => {
    const rows = compareMonthlyMovements('2026-10', [
      { date: '2026-10-01', debit: 100, credit: 20 },
      { date: '2026-10-01', debit: 50.25, credit: 30 },
    ], [{ date: '2026-10-01', debit: 150.25, credit: 50 }]);
    expect(rows[0]).toMatchObject({ debit: 150.25, credit: 50, debitDifference: 0, creditDifference: 0, matches: true });
  });
  test('includes all days and isolates selected month including leap year', () => {
    const rows = compareMonthlyMovements('2024-02', [{ date: '2024-03-01', debit: 999, credit: 0 }], []);
    expect(rows).toHaveLength(29);
    expect(rows[28].date).toBe('2024-02-29');
    expect(rows.reduce((sum, r) => sum + r.debit, 0)).toBe(0);
  });
  test('shows bank minus current differences even for a day absent from the statement', () => {
    const rows = compareMonthlyMovements('2026-11', [{ date: '2026-11-02', debit: 10, credit: 25 }], [{ date: '2026-11-01', debit: 30, credit: 0 }]);
    expect(rows[0].debitDifference).toBe(30);
    expect(rows[1]).toMatchObject({ debitDifference: -10, creditDifference: -25, matches: false });
  });
  test('bank perspective reverses debit and credit only when selected', () => {
    const bank = [{ date: '2026-11-01', debit: 0, credit: 100 }];
    expect(compareMonthlyMovements('2026-11', [], bank)[0].bankCredit).toBe(100);
    expect(compareMonthlyMovements('2026-11', [], bank, true)[0].bankDebit).toBe(100);
  });
  test('localized amounts and dates parse without silent invalid zero values', () => {
    expect(statementAmount('١٬٢٣٤٫٥٦')).toBe(1234.56);
    expect(statementAmount('not an amount')).toBeNull();
    expect(statementDate('٩/١١/٢٠٢٦')).toBe('2026-11-09');
    expect(statementDate('31/02/2026')).toBeNull();
    expect(statementDate(46335)).toBe('2026-11-09');
  });
  test('mapped statement columns reject invalid transaction rows', () => {
    const rows = [['التاريخ', 'مدين', 'دائن'], ['09/11/2026', '100.50', ''], ['bad', 20, 0], ['10/11/2026', 'bad', 0]];
    const result = parseStatementRows(rows, detectStatementColumns(rows[0]), 1);
    expect(result.movements).toEqual([{ date: '2026-11-09', debit: 100.5, credit: 0 }]);
    expect(result.rejected).toEqual([3, 4]);
  });
});