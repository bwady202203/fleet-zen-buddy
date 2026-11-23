import { format } from "date-fns";

export interface JournalVoucherLine {
  accountCode: string;
  accountName: string;
  description: string;
  branchName?: string;
  costCenterCode?: string;
  costCenterName?: string;
  debit: number;
  credit: number;
}

export interface JournalVoucherEntry {
  universalSerial?: string | null;
  entryNumber: string;
  date: string;
  description: string | null;
  lines: JournalVoucherLine[];
  totalDebit: number;
  totalCredit: number;
}

/** نسخة من قالب طباعة سند القيد في شاشة قيود اليومية */
export default function JournalEntryVoucher({ entry }: { entry: JournalVoucherEntry }) {
  const selectedEntry = entry;
  return (
    <>
            {(() => {
              const LINES_PER_PAGE = 15;
              const lines = selectedEntry.lines;
              const totalPages = Math.ceil(lines.length / LINES_PER_PAGE);
              const pages = [];

              for (let pageNum = 0; pageNum < totalPages; pageNum++) {
                const startIdx = pageNum * LINES_PER_PAGE;
                const endIdx = Math.min(startIdx + LINES_PER_PAGE, lines.length);
                const pageLines = lines.slice(startIdx, endIdx);
                
                // حساب المجاميع لكل صفحة
                const pageDebit = pageLines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
                const pageCredit = pageLines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);

                pages.push(
                  <div key={pageNum} className="max-w-4xl mx-auto bg-white p-8 page-break" dir="rtl">
                    {/* رأس الصفحة */}
                    <div className="text-center mb-6 border-b-2 border-gray-400 pb-4">
                      <h1 className="text-3xl font-bold mb-2 text-gray-800">سند قيد يومية</h1>
                      <h2 className="text-xl text-gray-600">Journal Entry Voucher</h2>
                    </div>

                    {/* معلومات القيد */}
                    <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded">
                      <div>
                        <div className="text-sm text-gray-600">المسلسل</div>
                        <div className="font-bold text-lg text-blue-800 font-mono">{selectedEntry.universalSerial || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">رقم القيد</div>
                        <div className="font-bold text-lg text-gray-800">{selectedEntry.entryNumber}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">التاريخ</div>
                        <div className="font-bold text-lg text-gray-800">
                          {format(new Date(selectedEntry.date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">البيان / Description</div>
                        <div className="font-bold text-lg text-gray-800">{selectedEntry.description || '-'}</div>
                      </div>
                    </div>

                    {/* جدول السطور */}
                    <table className="w-full border-collapse border border-gray-400 mb-4">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-400">
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            رمز الحساب<br/>Account Code
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            اسم الحساب<br/>Account Name
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            البيان<br/>Description
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            الفرع<br/>Branch
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            مركز التكلفة<br/>Cost Center
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            المدين<br/>Debit
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            الدائن<br/>Credit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageLines.map((line: any, index: number) => (
                          <tr key={startIdx + index} className="bg-white">
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.accountCode}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.accountName}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.description}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.branchName || '-'}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">
                              {line.costCenterName ? `${line.costCenterCode ? line.costCenterCode + ' - ' : ''}${line.costCenterName}` : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-red-600 font-bold text-sm">
                              {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-green-600 font-bold text-sm">
                              {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                          </tr>
                        ))}
                        
                        {/* مجموع الصفحة */}
                        <tr className="bg-gray-50 font-bold border-t-2 border-gray-400">
                          <td colSpan={5} className="border border-gray-400 p-2 text-left text-gray-800 text-sm">
                            مجموع الصفحة / Page Total
                          </td>
                          <td className="border border-gray-400 p-2 text-red-600 text-sm">
                            {pageDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-400 p-2 text-green-600 text-sm">
                            {pageCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* المجموع الكلي في الصفحة الأخيرة فقط */}
                        {pageNum === totalPages - 1 && (
                          <tr className="bg-gray-100 font-bold text-lg border-t-2 border-gray-400">
                            <td colSpan={5} className="border border-gray-400 p-3 text-left text-gray-800">
                              الإجمالي الكلي / Grand Total
                            </td>
                            <td className="border border-gray-400 p-3 text-red-600">
                              {selectedEntry.totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-gray-400 p-3 text-green-600">
                              {selectedEntry.totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* التوقيعات في الصفحة الأخيرة فقط */}
                    {pageNum === totalPages - 1 && (
                      <div className="grid grid-cols-3 gap-8 mt-8 pt-6 border-t border-gray-400">
                        <div className="text-center">
                          <div className="border-t border-gray-400 pt-2 mt-12">
                            <div className="font-bold text-gray-800">المحاسب</div>
                            <div className="text-sm text-gray-600">Accountant</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-gray-400 pt-2 mt-12">
                            <div className="font-bold text-gray-800">المدير المالي</div>
                            <div className="text-sm text-gray-600">Financial Manager</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-gray-400 pt-2 mt-12">
                            <div className="font-bold text-gray-800">المعتمد</div>
                            <div className="text-sm text-gray-600">Approved By</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* تذييل الصفحة */}
                    <div className="mt-6 flex justify-between text-sm text-gray-500 border-t border-gray-300 pt-3">
                      <div>صفحة {pageNum + 1} من {totalPages} | Page {pageNum + 1} of {totalPages}</div>
                      <div>
                        تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')} | Print Date: {new Date().toLocaleDateString('en-US')}
                      </div>
                    </div>
                  </div>
                );
              }

              return <>{pages}</>;
            })()}
    </>
  );
}
