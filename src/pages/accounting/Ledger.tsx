import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounting } from "@/contexts/AccountingContext";
import { Link } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";

const Ledger = () => {
  const { accounts, journalEntries } = useAccounting();
  const [selectedAccount, setSelectedAccount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const level4Accounts = accounts.filter(acc => acc.level === 4);
  
  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  
  const filteredEntries = journalEntries.filter(entry => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return entry.lines.some(line => line.accountId === selectedAccount);
  });

  const ledgerEntries = filteredEntries.flatMap(entry => 
    entry.lines
      .filter(line => line.accountId === selectedAccount)
      .map(line => ({
        date: entry.date,
        entryNumber: entry.entryNumber,
        description: line.description || entry.description,
        debit: line.debit,
        credit: line.credit,
      }))
  );

  let runningBalance = 0;
  const ledgerWithBalance = ledgerEntries.map(entry => {
    runningBalance += entry.debit - entry.credit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });

  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
                <p className="text-muted-foreground mt-1">
                  عرض حركة الحسابات التفصيلية
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>فلترة البيانات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>الحساب</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {level4Accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedAccountData && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{selectedAccountData.code} - {selectedAccountData.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAccountData.nameEn}</p>
                </div>
                <div className="text-left">
                  <div className="text-sm text-muted-foreground">الرصيد الحالي</div>
                  <div className="text-2xl font-bold">
                    {runningBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">رقم القيد</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">المدين</TableHead>
                    <TableHead className="text-right">الدائن</TableHead>
                    <TableHead className="text-right">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerWithBalance.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(entry.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-left font-medium">
                        {entry.debit > 0 ? entry.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell className="text-left font-medium">
                        {entry.credit > 0 ? entry.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell className="text-left font-bold">
                        {entry.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {ledgerWithBalance.length > 0 && (
                    <TableRow className="font-bold bg-accent/50">
                      <TableCell colSpan={3} className="text-right">الإجمالي</TableCell>
                      <TableCell className="text-left">
                        {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left">
                        {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left">
                        {runningBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )}
                  {ledgerWithBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد حركات على هذا الحساب
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!selectedAccountData && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">يرجى اختيار حساب لعرض دفتر الأستاذ</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Ledger;
