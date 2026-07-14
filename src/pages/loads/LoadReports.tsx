import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, FileText, Send, Printer, Eye, Trash2, Building2, Download, Calendar as CalendarIcon, Receipt, Plus, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HijriDate, { toHijri } from 'hijri-converter';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface DriverPayment {
  id: string;
  amount: number;
  payment_date: string;
  notes: string;
}

interface DriverReport {
  driverId: string;
  driverName: string;
  loads: any[];
  totalCommission: number;
  totalPaid: number;
  remaining: number;
}

interface TransferReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  transfer_date: string;
  description: string | null;
  driver_id: string;
}

interface PaymentDriver {
  id: string;
  name: string;
  phone: string | null;
  total_due: number;
  total_paid: number;
  remaining: number;
}

const LoadReports = () => {
  const [driverReports, setDriverReports] = useState<DriverReport[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedDriverForPayment, setSelectedDriverForPayment] = useState<DriverReport | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  
  // Company report states
  const [companyLoads, setCompanyLoads] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterLoadType, setFilterLoadType] = useState<string>("all");
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [invoiceDateFrom, setInvoiceDateFrom] = useState<Date | undefined>(undefined);
  const [invoiceDateTo, setInvoiceDateTo] = useState<Date | undefined>(undefined);

  // Payment report states
  const [paymentDrivers, setPaymentDrivers] = useState<PaymentDriver[]>([]);
  const [receipts, setReceipts] = useState<Record<string, TransferReceipt[]>>({});
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [quickReceiptDialogOpen, setQuickReceiptDialogOpen] = useState(false);
  const [editReceiptDialogOpen, setEditReceiptDialogOpen] = useState(false);
  const [selectedDriverIdForReceipt, setSelectedDriverIdForReceipt] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<TransferReceipt | null>(null);
  const [receiptFormData, setReceiptFormData] = useState({
    receipt_number: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [loadingPaymentReport, setLoadingPaymentReport] = useState(false);

  // Invoice quantities report states
  const [invQtyFrom, setInvQtyFrom] = useState<Date | undefined>(undefined);
  const [invQtyTo, setInvQtyTo] = useState<Date | undefined>(undefined);
  const [invQtyRows, setInvQtyRows] = useState<Array<{ companyId: string; companyName: string; quantities: Record<string, number>; total: number }>>([]);
  const [invQtyTypes, setInvQtyTypes] = useState<string[]>([]);
  const [invQtyLoading, setInvQtyLoading] = useState(false);

  const handleGenerateInvoiceQuantitiesReport = async () => {
    if (!invQtyFrom || !invQtyTo) {
      toast({ title: "خطأ", description: "الرجاء تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }
    setInvQtyLoading(true);
    try {
      const from = format(invQtyFrom, 'yyyy-MM-dd');
      const to = format(invQtyTo, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('load_invoices')
        .select(`
          id, date, company_id,
          companies(id, name),
          load_invoice_items(quantity, loads(load_types(name)))
        `)
        .gte('date', from)
        .lte('date', to);
      if (error) throw error;

      const companyMap: Record<string, { companyId: string; companyName: string; quantities: Record<string, number>; total: number }> = {};
      const typesSet = new Set<string>();

      (data || []).forEach((inv: any) => {
        const companyId = inv.company_id || 'unknown';
        const companyName = inv.companies?.name || 'غير محدد';
        if (!companyMap[companyId]) {
          companyMap[companyId] = { companyId, companyName, quantities: {}, total: 0 };
        }
        (inv.load_invoice_items || []).forEach((item: any) => {
          const typeName = item.loads?.load_types?.name || 'غير محدد';
          const qty = parseFloat(item.quantity) || 0;
          typesSet.add(typeName);
          companyMap[companyId].quantities[typeName] = (companyMap[companyId].quantities[typeName] || 0) + qty;
          companyMap[companyId].total += qty;
        });
      });

      const types = Array.from(typesSet).sort();
      const rows = Object.values(companyMap).sort((a, b) => a.companyName.localeCompare(b.companyName, 'ar'));
      setInvQtyTypes(types);
      setInvQtyRows(rows);
      toast({ title: "تم", description: `تم إنشاء التقرير (${rows.length} شركة)` });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "تعذر إنشاء التقرير", variant: "destructive" });
    } finally {
      setInvQtyLoading(false);
    }
  };

  const handleExportInvoiceQuantities = () => {
    if (invQtyRows.length === 0) return;
    const rows = invQtyRows.map((r, i) => {
      const row: any = { '#': i + 1, 'الشركة': r.companyName };
      invQtyTypes.forEach(t => { row[t] = r.quantities[t] || 0; });
      row['الإجمالي'] = r.total;
      return row;
    });
    const totalsRow: any = { '#': '', 'الشركة': 'الإجمالي' };
    let grand = 0;
    invQtyTypes.forEach(t => {
      const s = invQtyRows.reduce((sum, r) => sum + (r.quantities[t] || 0), 0);
      totalsRow[t] = s;
      grand += s;
    });
    totalsRow['الإجمالي'] = grand;
    rows.push(totalsRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كميات الفواتير');
    XLSX.writeFile(wb, `invoice-quantities-${format(invQtyFrom!, 'yyyy-MM-dd')}_${format(invQtyTo!, 'yyyy-MM-dd')}.xlsx`);
  };

  useEffect(() => {
    loadDrivers();
    loadDriverReports();
    loadCompanyLoads();
    loadCompanies();
    loadLoadTypes();
    loadPaymentDriversData();
  }, []);

  const loadDrivers = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setDrivers(data);
    }
  };

  const loadDriverReports = async () => {
    const { data: loads } = await supabase
      .from('loads')
      .select(`
        *,
        drivers(id, name),
        companies(name),
        load_types(name, commission_rate)
      `);

    const { data: payments } = await supabase
      .from('driver_payments')
      .select('*');

    if (loads) {
      const grouped = loads.reduce((acc: any, load: any) => {
        const driverId = load.drivers?.id || 'unknown';
        const driverName = load.drivers?.name || 'غير محدد';
        if (!acc[driverId]) {
          acc[driverId] = {
            driverId,
            driverName,
            loads: [],
          };
        }
        acc[driverId].loads.push(load);
        return acc;
      }, {});

      const reports: DriverReport[] = Object.values(grouped).map((group: any) => {
        const totalCommission = group.loads.reduce((sum: number, load: any) => {
          return sum + (parseFloat(load.unit_price) || 0);
        }, 0);
        const driverPayments = payments?.filter((p: any) => p.driver_id === group.driverId) || [];
        const totalPaid = driverPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        return {
          driverId: group.driverId,
          driverName: group.driverName,
          loads: group.loads,
          totalCommission,
          totalPaid,
          remaining: totalCommission - totalPaid
        };
      });

      setDriverReports(reports);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedDriverForPayment || !paymentAmount) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال المبلغ",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedDriverForPayment.remaining) {
      toast({
        title: "خطأ",
        description: "المبلغ غير صحيح",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('driver_payments')
      .insert({
        driver_id: selectedDriverForPayment.driverId,
        amount,
        notes: paymentNotes,
        created_by: userData?.user?.id,
      });

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة سند التحويل",
        variant: "destructive",
      });
    } else {
      toast({
        title: "نجح",
        description: "تم إضافة سند التحويل بنجاح",
      });
      setPaymentDialog(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setSelectedDriverForPayment(null);
      loadDriverReports();
    }
  };

  const handleDeleteLoad = async (loadId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحمولة؟')) return;

    const { error } = await supabase
      .from('loads')
      .delete()
      .eq('id', loadId);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الحمولة",
        variant: "destructive",
      });
    } else {
      toast({
        title: "نجح",
        description: "تم حذف الحمولة بنجاح",
      });
      loadDriverReports();
    }
  };

  const loadCompanyLoads = async () => {
    const { data } = await supabase
      .from('loads')
      .select(`
        *,
        drivers(id, name),
        companies(id, name),
        load_types(id, name)
      `)
      .order('date', { ascending: false });
    
    if (data) {
      setCompanyLoads(data);
    }
  };

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setCompanies(data);
    }
  };

  const loadLoadTypes = async () => {
    const { data } = await supabase
      .from('load_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setLoadTypes(data);
    }
  };

  const convertToHijri = (gregorianDate: string) => {
    const date = new Date(gregorianDate);
    const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${hijri.hy}-${String(hijri.hm).padStart(2, '0')}-${String(hijri.hd).padStart(2, '0')}`;
  };

  const handlePrintDriverReport = (report: DriverReport) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const today = new Date();
      const hijriDate = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
      const hijriString = `${hijriDate.hd}/${hijriDate.hm}/${hijriDate.hy}`;
      
      const tableRows = report.loads.map((load: any) => {
        const loadHijri = toHijri(new Date(load.date).getFullYear(), new Date(load.date).getMonth() + 1, new Date(load.date).getDate());
        const loadHijriStr = `${loadHijri.hd}/${loadHijri.hm}/${loadHijri.hy}`;
        
        let invoiceHijriStr = '-';
        if (load.invoice_date) {
          const invHijri = toHijri(new Date(load.invoice_date).getFullYear(), new Date(load.invoice_date).getMonth() + 1, new Date(load.invoice_date).getDate());
          invoiceHijriStr = `${invHijri.hd}/${invHijri.hm}/${invHijri.hy}`;
        }
        
        return `
          <tr>
            <td>${load.load_number}</td>
            <td>${new Date(load.date).toLocaleDateString('ar-SA')}<br><span style="color: #666; font-size: 0.85em;">${loadHijriStr} هـ</span></td>
            <td>${load.invoice_date ? new Date(load.invoice_date).toLocaleDateString('ar-SA') : '-'}<br><span style="color: #666; font-size: 0.85em;">${invoiceHijriStr}</span></td>
            <td>${load.companies?.name || '-'}</td>
            <td>${load.load_types?.name || '-'}</td>
            <td style="font-weight: bold;">${load.quantity}</td>
            <td style="font-weight: bold; color: #2563eb;">${parseFloat(load.unit_price).toFixed(2)} ر.س</td>
          </tr>
        `;
      }).join('');

      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير السائق - ${report.driverName}</title>
            <meta charset="UTF-8">
            <style>
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
                direction: rtl;
              }
              body { 
                font-family: 'Arial', 'Tahoma', sans-serif; 
                padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
              }
              .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 3px solid #667eea;
              }
              .logo {
                font-size: 2.5em;
                font-weight: bold;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
              }
              .report-title {
                font-size: 1.8em;
                color: #1e293b;
                margin-bottom: 10px;
                font-weight: 600;
              }
              .report-subtitle {
                color: #64748b;
                font-size: 1.1em;
              }
              .driver-info {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
              }
              .driver-name {
                font-size: 2em;
                font-weight: bold;
                margin-bottom: 20px;
                text-align: center;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-top: 20px;
              }
              .summary-card {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
              }
              .summary-label {
                font-size: 0.9em;
                opacity: 0.95;
                margin-bottom: 10px;
                font-weight: 500;
              }
              .summary-value {
                font-size: 1.8em;
                font-weight: bold;
              }
              table { 
                width: 100%; 
                border-collapse: separate;
                border-spacing: 0;
                margin: 30px 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                overflow: hidden;
              }
              thead {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              th { 
                color: white;
                padding: 18px 15px;
                text-align: right;
                font-weight: 600;
                font-size: 0.95em;
                letter-spacing: 0.5px;
              }
              td { 
                padding: 15px;
                text-align: right;
                border-bottom: 1px solid #e2e8f0;
                color: #334155;
              }
              tbody tr {
                transition: background-color 0.2s;
              }
              tbody tr:hover {
                background-color: #f8fafc;
              }
              tbody tr:last-child td {
                border-bottom: none;
              }
              .footer {
                margin-top: 50px;
                padding-top: 30px;
                border-top: 2px solid #e2e8f0;
                text-align: center;
              }
              .date-info {
                display: flex;
                justify-content: space-between;
                color: #64748b;
                font-size: 0.95em;
                margin-bottom: 15px;
              }
              .signature-section {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 40px;
                margin-top: 60px;
              }
              .signature-box {
                text-align: center;
                padding: 20px;
                border: 2px dashed #cbd5e1;
                border-radius: 10px;
              }
              .signature-label {
                color: #64748b;
                font-weight: 600;
                margin-bottom: 10px;
              }
              .signature-line {
                margin-top: 40px;
                border-top: 2px solid #94a3b8;
                padding-top: 10px;
                color: #64748b;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .container {
                  box-shadow: none;
                }
              }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 8em;
                color: rgba(102, 126, 234, 0.05);
                font-weight: bold;
                z-index: -1;
                pointer-events: none;
              }
            </style>
          </head>
          <body>
            <div class="watermark">تقرير السائق</div>
            <div class="container">
              <div class="header">
                <div class="logo">🚛 نظام إدارة الشحنات</div>
                <div class="report-title">تقرير السائق والعمولات</div>
                <div class="report-subtitle">كشف حساب مفصل</div>
              </div>

              <div class="driver-info">
                <div class="driver-name">👤 ${report.driverName}</div>
                <div class="summary-grid">
                  <div class="summary-card">
                    <div class="summary-label">💰 إجمالي المستحقات</div>
                    <div class="summary-value">${report.totalCommission.toFixed(2)}</div>
                    <div style="font-size: 0.9em; margin-top: 5px;">ريال سعودي</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">✅ المبلغ المدفوع</div>
                    <div class="summary-value">${report.totalPaid.toFixed(2)}</div>
                    <div style="font-size: 0.9em; margin-top: 5px;">ريال سعودي</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">⏳ المتبقي</div>
                    <div class="summary-value">${report.remaining.toFixed(2)}</div>
                    <div style="font-size: 0.9em; margin-top: 5px;">ريال سعودي</div>
                  </div>
                </div>
              </div>

              <h3 style="color: #1e293b; font-size: 1.4em; margin-bottom: 20px; font-weight: 600;">📋 تفاصيل الشحنات</h3>
              <table>
                <thead>
                  <tr>
                    <th>رقم الشحنة</th>
                    <th>التاريخ</th>
                    <th>تاريخ الفاتورة</th>
                    <th>العميل</th>
                    <th>نوع الحمولة</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>

              <div class="footer">
                <div class="date-info">
                  <div>
                    <strong>📅 تاريخ الطباعة (ميلادي):</strong> ${today.toLocaleDateString('ar-SA')}
                  </div>
                  <div>
                    <strong>📅 تاريخ الطباعة (هجري):</strong> ${hijriString} هـ
                  </div>
                </div>
                
                <div class="signature-section">
                  <div class="signature-box">
                    <div class="signature-label">توقيع المحاسب</div>
                    <div class="signature-line">.....................</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-label">توقيع السائق</div>
                    <div class="signature-line">.....................</div>
                  </div>
                </div>
                
                <p style="margin-top: 30px; color: #94a3b8; font-size: 0.9em;">
                  هذا التقرير تم إنشاؤه آلياً من نظام إدارة الشحنات
                </p>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintLoad = (load: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>طباعة الحمولة - ${load.load_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>تفاصيل الحمولة</h1>
            <table>
              <tr><th>رقم الشحنة</th><td>${load.load_number}</td></tr>
              <tr><th>التاريخ</th><td>${new Date(load.date).toLocaleDateString('ar-SA')}</td></tr>
              <tr><th>العميل</th><td>${load.companies?.name || '-'}</td></tr>
              <tr><th>نوع الحمولة</th><td>${load.load_types?.name || '-'}</td></tr>
              <tr><th>الكمية</th><td>${load.quantity}</td></tr>
              <tr><th>السعر</th><td>${parseFloat(load.unit_price).toFixed(2)} ر.س</td></tr>
            </table>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const filteredReports = driverReports
    .filter(r => selectedDriver === "all" || r.driverId === selectedDriver)
    .map(report => ({
      ...report,
      loads: report.loads.filter((load: any) => {
        const loadDate = new Date(load.date);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (loadDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (loadDate > toDate) return false;
        }
        
        // Invoice date filter
        if (load.invoice_date) {
          const invoiceDate = new Date(load.invoice_date);
          if (invoiceDateFrom) {
            const fromDate = new Date(invoiceDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (invoiceDate < fromDate) return false;
          }
          if (invoiceDateTo) {
            const toDate = new Date(invoiceDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (invoiceDate > toDate) return false;
          }
        } else if (invoiceDateFrom || invoiceDateTo) {
          // If invoice date filter is set but load has no invoice date, exclude it
          return false;
        }
        
        return true;
      })
    }))
    .map(report => {
      const totalCommission = report.loads.reduce((sum: number, load: any) => {
        return sum + (parseFloat(load.unit_price) || 0);
      }, 0);
      const driverPayments = report.loads.length > 0 ? 
        driverReports.find(r => r.driverId === report.driverId)?.totalPaid || 0 : 0;
      return {
        ...report,
        totalCommission,
        remaining: totalCommission - driverPayments
      };
    })
    .filter(report => report.loads.length > 0);

  const filteredCompanyLoads = companyLoads.filter(load => {
    if (filterCompany !== "all" && load.company_id !== filterCompany) return false;
    if (filterLoadType !== "all" && load.load_type_id !== filterLoadType) return false;
    if (filterDriver !== "all" && load.driver_id !== filterDriver) return false;
    
    // Date filter
    const loadDate = new Date(load.date);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (loadDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (loadDate > toDate) return false;
    }
    
    return true;
  });

  const totalQuantity = filteredCompanyLoads.reduce((sum, load) => sum + (parseFloat(load.quantity) || 0), 0);

  // Calculate totals by load type
  const totalsByLoadType = filteredCompanyLoads.reduce((acc: any, load) => {
    const loadTypeName = load.load_types?.name || 'غير محدد';
    if (!acc[loadTypeName]) {
      acc[loadTypeName] = 0;
    }
    acc[loadTypeName] += parseFloat(load.quantity) || 0;
    return acc;
  }, {});

  const handlePrintCompanyReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const tableRows = filteredCompanyLoads.map(load => `
        <tr>
          <td>${load.load_number}</td>
          <td>${new Date(load.date).toLocaleDateString('ar-SA')}</td>
          <td>${load.invoice_date ? new Date(load.invoice_date).toLocaleDateString('ar-SA') : '-'}</td>
          <td>${load.companies?.name || '-'}</td>
          <td>${load.load_types?.name || '-'}</td>
          <td>${load.quantity}</td>
          <td>${load.drivers?.name || '-'}</td>
        </tr>
      `).join('');

      const totalRowsByType = Object.entries(totalsByLoadType).map(([typeName, total]: [string, any]) => `
        <tr class="subtotal-row">
          <td colspan="4" style="text-align: center;">إجمالي ${typeName}</td>
          <td style="font-weight: bold;">${typeName}</td>
          <td style="font-weight: bold;">${total.toFixed(2)}</td>
          <td></td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير الشركات والشحنات</title>
            <meta charset="UTF-8">
            <style>
              * { direction: rtl; }
              body { 
                font-family: 'Arial', 'Tahoma', sans-serif; 
                padding: 20px; 
                direction: rtl;
              }
              h1 { 
                text-align: center; 
                margin-bottom: 30px;
                color: #333;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
                direction: rtl;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 10px; 
                text-align: right;
                direction: rtl;
              }
              th { 
                background-color: #4a5568; 
                color: white;
                font-weight: bold; 
              }
              .subtotal-row { 
                background-color: #e3f2fd; 
                font-weight: bold;
                color: #1976d2;
              }
              .total-row { 
                background-color: #c8e6c9; 
                font-weight: bold;
                font-size: 1.1em;
                color: #2e7d32;
              }
              .summary-section {
                margin-top: 30px;
                padding: 20px;
                background-color: #f5f5f5;
                border-radius: 8px;
              }
              .summary-title {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
                text-align: center;
              }
              .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #ddd;
              }
              .footer { 
                margin-top: 30px; 
                text-align: center; 
                color: #666;
                direction: rtl;
              }
            </style>
          </head>
          <body>
            <h1>تقرير الشركات والشحنات</h1>
            <table>
              <thead>
                 <tr>
                   <th>رقم الشحنة</th>
                   <th>التاريخ</th>
                   <th>تاريخ الفاتورة</th>
                   <th>اسم الشركة</th>
                   <th>نوع الحمولة</th>
                   <th>الكمية</th>
                   <th>اسم السائق</th>
                 </tr>
              </thead>
              <tbody>
                 ${tableRows}
                 ${totalRowsByType}
                 <tr class="total-row">
                   <td colspan="5" style="text-align: center;">الإجمالي الكلي</td>
                   <td>${totalQuantity.toFixed(2)}</td>
                   <td></td>
                 </tr>
              </tbody>
            </table>
            
            <div class="summary-section">
              <div class="summary-title">ملخص الكميات حسب نوع الحمولة</div>
              ${Object.entries(totalsByLoadType).map(([typeName, total]: [string, any]) => `
                <div class="summary-item">
                  <span>${typeName}</span>
                  <span style="font-weight: bold; color: #1976d2;">${total.toFixed(2)}</span>
                </div>
              `).join('')}
              <div class="summary-item" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;">
                <span style="font-weight: bold;">الإجمالي الكلي</span>
                <span style="font-weight: bold; color: #2e7d32; font-size: 1.2em;">${totalQuantity.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</p>
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleExportToExcel = () => {
    const excelData = filteredCompanyLoads.map(load => ({
      'رقم الشحنة': load.load_number,
      'التاريخ': new Date(load.date).toLocaleDateString('ar-SA'),
      'تاريخ الفاتورة': load.invoice_date ? new Date(load.invoice_date).toLocaleDateString('ar-SA') : '-',
      'اسم الشركة': load.companies?.name || '-',
      'نوع الحمولة': load.load_types?.name || '-',
      'الكمية': load.quantity,
      'اسم السائق': load.drivers?.name || '-'
    }));

    // Add subtotal rows for each load type
    Object.entries(totalsByLoadType).forEach(([typeName, total]: [string, any]) => {
      excelData.push({
        'رقم الشحنة': '',
        'التاريخ': '',
        'تاريخ الفاتورة': '',
        'اسم الشركة': '',
        'نوع الحمولة': `إجمالي ${typeName}`,
        'الكمية': total.toFixed(2),
        'اسم السائق': ''
      });
    });

    // Add total row
    excelData.push({
      'رقم الشحنة': '',
      'التاريخ': '',
      'تاريخ الفاتورة': '',
      'اسم الشركة': '',
      'نوع الحمولة': 'الإجمالي الكلي',
      'الكمية': totalQuantity.toFixed(2),
      'اسم السائق': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الشركات');
    
    const fileName = `تقرير_الشركات_${new Date().toLocaleDateString('ar-SA')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "نجح",
      description: "تم تصدير التقرير بنجاح",
    });
  };

  // Payment Report Functions
  const loadPaymentDriversData = async () => {
    setLoadingPaymentReport(true);
    try {
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (driversError) throw driversError;

      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('*');

      if (loadsError) throw loadsError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('driver_payments')
        .select('*');

      if (paymentsError) throw paymentsError;

      const { data: receiptsData, error: receiptsError } = await supabase
        .from('driver_transfer_receipts')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (receiptsError) throw receiptsError;

      const driversWithTotals = driversData?.map(driver => {
        const driverLoads = loadsData?.filter(load => load.driver_id === driver.id) || [];
        const driverPayments = paymentsData?.filter(payment => payment.driver_id === driver.id) || [];
        
        const total_due = driverLoads.reduce((sum, load) => {
          const unitPrice = load.unit_price ? parseFloat(String(load.unit_price)) : 0;
          return sum + unitPrice;
        }, 0);
        
        const total_paid = driverPayments.reduce((sum, payment) => {
          return sum + (payment.amount || 0);
        }, 0);
        
        const remaining = total_due - total_paid;

        return {
          ...driver,
          total_due,
          total_paid,
          remaining
        };
      }) || [];

      setPaymentDrivers(driversWithTotals);

      const receiptsByDriver: Record<string, TransferReceipt[]> = {};
      receiptsData?.forEach(receipt => {
        if (!receiptsByDriver[receipt.driver_id]) {
          receiptsByDriver[receipt.driver_id] = [];
        }
        receiptsByDriver[receipt.driver_id].push(receipt);
      });
      setReceipts(receiptsByDriver);

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingPaymentReport(false);
    }
  };

  const handleQuickReceipt = (driverId: string) => {
    setSelectedDriverIdForReceipt(driverId);
    setReceiptFormData({
      receipt_number: '',
      amount: '',
      transfer_date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setQuickReceiptDialogOpen(true);
  };

  const handleQuickReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverIdForReceipt) return;

    setLoadingPaymentReport(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('driver_payments')
        .insert({
          driver_id: selectedDriverIdForReceipt,
          amount: parseFloat(receiptFormData.amount),
          payment_date: receiptFormData.transfer_date,
          notes: `${receiptFormData.receipt_number} - ${receiptFormData.description || ''}`.trim(),
          created_by: userData?.user?.id
        });

      if (error) throw error;

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userData?.user?.id)
        .single();

      await supabase
        .from('driver_transfer_receipts')
        .insert({
          driver_id: selectedDriverIdForReceipt,
          receipt_number: receiptFormData.receipt_number,
          amount: parseFloat(receiptFormData.amount),
          transfer_date: receiptFormData.transfer_date,
          description: receiptFormData.description || null,
          organization_id: orgData?.organization_id,
          created_by: userData?.user?.id
        });

      toast({
        title: "تم الإضافة",
        description: "تم إضافة سند التحويل بنجاح"
      });

      setQuickReceiptDialogOpen(false);
      await loadPaymentDriversData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingPaymentReport(false);
    }
  };

  const handleEditReceipt = (receipt: TransferReceipt) => {
    setEditingReceipt(receipt);
    setReceiptFormData({
      receipt_number: receipt.receipt_number,
      amount: receipt.amount.toString(),
      transfer_date: receipt.transfer_date,
      description: receipt.description || ''
    });
    setEditReceiptDialogOpen(true);
  };

  const handleEditReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    setLoadingPaymentReport(true);
    try {
      const { data: paymentData } = await supabase
        .from('driver_payments')
        .select('id')
        .eq('driver_id', editingReceipt.driver_id)
        .eq('payment_date', editingReceipt.transfer_date)
        .eq('amount', editingReceipt.amount)
        .single();

      if (paymentData) {
        await supabase
          .from('driver_payments')
          .update({
            amount: parseFloat(receiptFormData.amount),
            payment_date: receiptFormData.transfer_date,
            notes: `${receiptFormData.receipt_number} - ${receiptFormData.description || ''}`.trim()
          })
          .eq('id', paymentData.id);
      }

      const { error } = await supabase
        .from('driver_transfer_receipts')
        .update({
          receipt_number: receiptFormData.receipt_number,
          amount: parseFloat(receiptFormData.amount),
          transfer_date: receiptFormData.transfer_date,
          description: receiptFormData.description || null
        })
        .eq('id', editingReceipt.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث سند التحويل بنجاح"
      });

      setEditReceiptDialogOpen(false);
      await loadPaymentDriversData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingPaymentReport(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string, driverId: string, amount: number, transferDate: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السند؟')) return;

    try {
      const { data: paymentData } = await supabase
        .from('driver_payments')
        .select('id')
        .eq('driver_id', driverId)
        .eq('payment_date', transferDate)
        .eq('amount', amount)
        .single();

      if (paymentData) {
        await supabase
          .from('driver_payments')
          .delete()
          .eq('id', paymentData.id);
      }

      const { error } = await supabase
        .from('driver_transfer_receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف سند التحويل بنجاح"
      });
      
      await loadPaymentDriversData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل حذف سند التحويل",
        variant: "destructive"
      });
    }
  };

  const toggleDriverExpansion = (driverId: string) => {
    setExpandedDriverId(expandedDriverId === driverId ? null : driverId);
  };

  const handlePrintPaymentReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const today = new Date();
      const hijriDate = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
      const hijriString = `${hijriDate.hd}/${hijriDate.hm}/${hijriDate.hy}`;
      
      const driversRows = paymentDrivers.map((driver) => {
        const driverReceipts = receipts[driver.id] || [];
        const receiptsRows = driverReceipts.length > 0 
          ? driverReceipts.map(receipt => `
              <tr style="background-color: #f8fafc;">
                <td colspan="2" style="padding: 8px 15px; border-bottom: 1px solid #e2e8f0;">
                  <strong>سند رقم:</strong> ${receipt.receipt_number}
                </td>
                <td style="padding: 8px 15px; border-bottom: 1px solid #e2e8f0;">
                  ${new Date(receipt.transfer_date).toLocaleDateString('ar-SA')}
                </td>
                <td style="padding: 8px 15px; border-bottom: 1px solid #e2e8f0; color: #16a34a;">
                  ${receipt.amount.toFixed(2)} ر.س
                </td>
                <td style="padding: 8px 15px; border-bottom: 1px solid #e2e8f0;">
                  ${receipt.description || '-'}
                </td>
              </tr>
            `).join('')
          : '';

        return `
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <td colspan="5" style="padding: 15px; font-weight: bold; font-size: 1.1em; text-align: right;">
              ${driver.name} ${driver.phone ? '- ' + driver.phone : ''}
            </td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 12px 15px; border-bottom: 2px solid #cbd5e1; font-weight: bold;">المستحق</td>
            <td style="padding: 12px 15px; border-bottom: 2px solid #cbd5e1; font-weight: bold;">المدفوع</td>
            <td style="padding: 12px 15px; border-bottom: 2px solid #cbd5e1; font-weight: bold;">المتبقي</td>
            <td colspan="2" style="padding: 12px 15px; border-bottom: 2px solid #cbd5e1; font-weight: bold;">عدد السندات</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">
              ${driver.total_due.toFixed(2)} ر.س
            </td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">
              ${driver.total_paid.toFixed(2)} ر.س
            </td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: ${driver.remaining > 0 ? '#dc2626' : '#64748b'}; font-weight: bold;">
              ${driver.remaining.toFixed(2)} ر.س
            </td>
            <td colspan="2" style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">
              ${driverReceipts.length} سند
            </td>
          </tr>
          ${receiptsRows}
          <tr style="height: 20px;"><td colspan="5"></td></tr>
        `;
      }).join('');

      const totalDue = paymentDrivers.reduce((sum, d) => sum + d.total_due, 0);
      const totalPaid = paymentDrivers.reduce((sum, d) => sum + d.total_paid, 0);
      const totalRemaining = paymentDrivers.reduce((sum, d) => sum + d.remaining, 0);

      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير مستحقات السائقين</title>
            <meta charset="UTF-8">
            <style>
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
                direction: rtl;
              }
              body { 
                font-family: 'Arial', 'Tahoma', sans-serif; 
                padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
              }
              .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 3px solid #667eea;
              }
              .logo {
                font-size: 2.5em;
                font-weight: bold;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
              }
              .report-title {
                font-size: 1.8em;
                color: #1e293b;
                margin-bottom: 10px;
                font-weight: 600;
              }
              .report-subtitle {
                color: #64748b;
                font-size: 1.1em;
              }
              table { 
                width: 100%; 
                border-collapse: separate;
                border-spacing: 0;
                margin: 30px 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                overflow: hidden;
              }
              td { 
                text-align: right;
              }
              .summary-section {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 15px;
                margin: 30px 0;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-top: 20px;
              }
              .summary-card {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
              }
              .summary-label {
                font-size: 0.9em;
                opacity: 0.95;
                margin-bottom: 10px;
              }
              .summary-value {
                font-size: 1.8em;
                font-weight: bold;
              }
              .footer {
                margin-top: 80px;
                padding-top: 30px;
                border-top: 2px solid #e2e8f0;
              }
              .date-info {
                display: flex;
                justify-content: space-between;
                color: #64748b;
                font-size: 0.95em;
                margin-bottom: 40px;
              }
              .signature-section {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 60px;
                margin-top: 60px;
              }
              .signature-box {
                text-align: center;
                padding: 20px;
              }
              .signature-label {
                color: #64748b;
                font-weight: 600;
                margin-bottom: 10px;
                font-size: 1.1em;
              }
              .signature-line {
                margin-top: 60px;
                border-top: 2px solid #94a3b8;
                padding-top: 10px;
                color: #64748b;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .container {
                  box-shadow: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🚛 نظام إدارة الشحنات</div>
                <div class="report-title">تقرير مستحقات السائقين</div>
                <div class="report-subtitle">كشف حساب تفصيلي</div>
              </div>

              <div class="summary-section">
                <h3 style="text-align: center; font-size: 1.5em; margin-bottom: 20px;">الملخص الإجمالي</h3>
                <div class="summary-grid">
                  <div class="summary-card">
                    <div class="summary-label">إجمالي المستحق</div>
                    <div class="summary-value">${totalDue.toFixed(2)} ر.س</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">إجمالي المدفوع</div>
                    <div class="summary-value">${totalPaid.toFixed(2)} ر.س</div>
                  </div>
                  <div class="summary-card">
                    <div class="summary-label">إجمالي المتبقي</div>
                    <div class="summary-value">${totalRemaining.toFixed(2)} ر.س</div>
                  </div>
                </div>
              </div>

              <table>
                ${driversRows}
              </table>

              <div class="footer">
                <div class="date-info">
                  <span>تاريخ الطباعة (ميلادي): ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</span>
                  <span>تاريخ الطباعة (هجري): ${hijriString} هـ</span>
                </div>
                
                <div class="signature-section">
                  <div class="signature-box">
                    <div class="signature-label">المحاسب</div>
                    <div class="signature-line">التوقيع</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-label">المدير المالي</div>
                    <div class="signature-line">التوقيع</div>
                  </div>
                </div>
              </div>
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleExportPaymentToExcel = () => {
    const excelData: any[] = [];

    paymentDrivers.forEach(driver => {
      excelData.push({
        'اسم السائق': driver.name,
        'رقم الهاتف': driver.phone || '-',
        'المستحق': driver.total_due.toFixed(2),
        'المدفوع': driver.total_paid.toFixed(2),
        'المتبقي': driver.remaining.toFixed(2),
        'عدد السندات': receipts[driver.id]?.length || 0
      });

      const driverReceipts = receipts[driver.id] || [];
      if (driverReceipts.length > 0) {
        driverReceipts.forEach(receipt => {
          excelData.push({
            'اسم السائق': '',
            'رقم الهاتف': `سند: ${receipt.receipt_number}`,
            'المستحق': '',
            'المدفوع': receipt.amount.toFixed(2),
            'المتبقي': new Date(receipt.transfer_date).toLocaleDateString('ar-SA'),
            'عدد السندات': receipt.description || '-'
          });
        });
      }

      excelData.push({
        'اسم السائق': '',
        'رقم الهاتف': '',
        'المستحق': '',
        'المدفوع': '',
        'المتبقي': '',
        'عدد السندات': ''
      });
    });

    const totalDue = paymentDrivers.reduce((sum, d) => sum + d.total_due, 0);
    const totalPaid = paymentDrivers.reduce((sum, d) => sum + d.total_paid, 0);
    const totalRemaining = paymentDrivers.reduce((sum, d) => sum + d.remaining, 0);

    excelData.push({
      'اسم السائق': 'الإجمالي',
      'رقم الهاتف': '',
      'المستحق': totalDue.toFixed(2),
      'المدفوع': totalPaid.toFixed(2),
      'المتبقي': totalRemaining.toFixed(2),
      'عدد السندات': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'مستحقات السائقين');
    
    const fileName = `تقرير_مستحقات_السائقين_${new Date().toLocaleDateString('ar-SA')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "نجح",
      description: "تم تصدير التقرير بنجاح",
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">التقارير</h1>
              <p className="text-muted-foreground mt-1">تقارير الحمولات والعمولات</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6" dir="rtl">
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              تقرير السائقين
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              تقرير الشركات
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              تقرير مستحقات السائقين
            </TabsTrigger>
            <TabsTrigger value="invoice-quantities" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              كميات الفواتير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <Card dir="rtl">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    تقرير السائقين والعمولات
                  </CardTitle>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>من تاريخ الشحنة</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>إلى تاريخ الشحنة</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>من تاريخ الفاتورة</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !invoiceDateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {invoiceDateFrom ? format(invoiceDateFrom, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceDateFrom}
                          onSelect={setInvoiceDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>إلى تاريخ الفاتورة</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !invoiceDateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {invoiceDateTo ? format(invoiceDateTo, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceDateTo}
                          onSelect={setInvoiceDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>فلتر حسب السائق</Label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر السائق" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع السائقين</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {filteredReports.map((report) => (
                <div key={report.driverId} className="space-y-6 border rounded-lg p-6 bg-card/50" dir="rtl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1 w-full">
                    <h3 className="text-2xl font-bold mb-4">{report.driverName}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">إجمالي المستحقات</p>
                        <p className="text-2xl font-bold text-primary">
                          {report.totalCommission.toFixed(2)} ر.س
                        </p>
                      </div>
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                        <p className="text-sm text-muted-foreground mb-1">المدفوع</p>
                        <p className="text-2xl font-bold text-green-600">
                          {report.totalPaid.toFixed(2)} ر.س
                        </p>
                      </div>
                      <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                        <p className="text-sm text-muted-foreground mb-1">المتبقي</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {report.remaining.toFixed(2)} ر.س
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => handlePrintDriverReport(report)}
                    className="w-full lg:w-auto"
                  >
                    <Eye className="h-5 w-5 ml-2" />
                    معاينة وطباعة التقرير
                  </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default"
                          size="lg"
                          disabled={report.remaining <= 0}
                          onClick={() => {
                            setSelectedDriverForPayment(report);
                            setPaymentAmount("");
                            setPaymentNotes("");
                          }}
                          className="w-full lg:w-auto"
                        >
                          <Send className="h-5 w-5 ml-2" />
                          سند تحويل
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>سند تحويل للسائق: {report.driverName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-primary/10 p-4 rounded-lg">
                          <Label className="text-sm text-muted-foreground">المبلغ المتبقي المستحق</Label>
                          <div className="text-3xl font-bold text-primary mt-2">
                            {report.remaining.toFixed(2)} ر.س
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">المبلغ المحول *</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            placeholder="0.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            max={report.remaining}
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-notes">ملاحظات</Label>
                          <Textarea
                            id="payment-notes"
                            placeholder="أدخل ملاحظات إضافية..."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button onClick={handleAddPayment} className="w-full" size="lg">
                          <Send className="h-4 w-4 ml-2" />
                          تأكيد التحويل
                        </Button>
                      </div>
                      </DialogContent>
                    </Dialog>
                   </div>

                <div className="rounded-lg border overflow-hidden bg-background" dir="rtl">
                  <Table>
                     <TableHeader>
                       <TableRow className="bg-muted/50">
                         <TableHead className="font-bold text-right">رقم الشحنة</TableHead>
                         <TableHead className="font-bold text-right">التاريخ</TableHead>
                         <TableHead className="font-bold text-right">تاريخ الفاتورة</TableHead>
                         <TableHead className="font-bold text-right">العميل</TableHead>
                         <TableHead className="font-bold text-right">نوع الحمولة</TableHead>
                         <TableHead className="font-bold text-right">الكمية</TableHead>
                         <TableHead className="font-bold text-right">السعر</TableHead>
                         <TableHead className="font-bold text-center">إجراءات</TableHead>
                       </TableRow>
                     </TableHeader>
                    <TableBody>
                       {report.loads.map((load: any) => (
                         <TableRow key={load.id}>
                           <TableCell className="font-medium text-right">{load.load_number}</TableCell>
                           <TableCell className="text-right">{format(new Date(load.date), "yyyy-MM-dd")}</TableCell>
                           <TableCell className="text-right">{load.invoice_date ? format(new Date(load.invoice_date), "yyyy-MM-dd") : '-'}</TableCell>
                           <TableCell className="text-right">{load.companies?.name || '-'}</TableCell>
                           <TableCell className="text-right">{load.load_types?.name || '-'}</TableCell>
                           <TableCell className="text-right">{load.quantity}</TableCell>
                           <TableCell className="font-bold text-primary text-right">
                             {parseFloat(load.unit_price).toFixed(2)} ر.س
                           </TableCell>
                           <TableCell>
                             <div className="flex gap-2 justify-center">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handlePrintLoad(load)}
                                 title="طباعة"
                               >
                                 <Printer className="h-4 w-4" />
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleDeleteLoad(load.id)}
                                 title="حذف"
                               >
                                 <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                             </div>
                           </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                    </Table>
                  </div>
                </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card dir="rtl">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-6 w-6" />
                    تقرير الشركات والشحنات
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrintCompanyReport}>
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </Button>
                    <Button variant="outline" onClick={handleExportToExcel}>
                      <Download className="h-4 w-4 ml-2" />
                      تصدير إكسل
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>من تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-right font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>إلى تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>فلتر حسب الشركة</Label>
                    <Select value={filterCompany} onValueChange={setFilterCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الشركة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الشركات</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>فلتر حسب نوع الحمولة</Label>
                    <Select value={filterLoadType} onValueChange={setFilterLoadType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الحمولة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع</SelectItem>
                        {loadTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>فلتر حسب السائق</Label>
                    <Select value={filterDriver} onValueChange={setFilterDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر السائق" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع السائقين</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                       <TableRow className="bg-muted/50">
                         <TableHead className="font-bold">رقم الشحنة</TableHead>
                         <TableHead className="font-bold">التاريخ</TableHead>
                         <TableHead className="font-bold">تاريخ الفاتورة</TableHead>
                         <TableHead className="font-bold">اسم الشركة</TableHead>
                         <TableHead className="font-bold">نوع الحمولة</TableHead>
                         <TableHead className="font-bold">الكمية</TableHead>
                         <TableHead className="font-bold">اسم السائق</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredCompanyLoads.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                             لا توجد شحنات
                           </TableCell>
                         </TableRow>
                       ) : (
                         <>
                           {filteredCompanyLoads.map((load) => (
                             <TableRow key={load.id}>
                               <TableCell className="font-medium">{load.load_number}</TableCell>
                               <TableCell>{format(new Date(load.date), "yyyy-MM-dd")}</TableCell>
                               <TableCell>{load.invoice_date ? format(new Date(load.invoice_date), "yyyy-MM-dd") : '-'}</TableCell>
                               <TableCell>{load.companies?.name || '-'}</TableCell>
                               <TableCell>{load.load_types?.name || '-'}</TableCell>
                               <TableCell>{load.quantity}</TableCell>
                               <TableCell>{load.drivers?.name || '-'}</TableCell>
                             </TableRow>
                           ))}
                           {Object.entries(totalsByLoadType).map(([typeName, total]: [string, any]) => (
                             <TableRow key={typeName} className="bg-blue-50 dark:bg-blue-950/30">
                               <TableCell colSpan={4} className="text-center font-semibold">
                                 إجمالي {typeName}
                               </TableCell>
                               <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                 {typeName}
                               </TableCell>
                               <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                 {total.toFixed(2)}
                               </TableCell>
                               <TableCell></TableCell>
                             </TableRow>
                           ))}
                           <TableRow className="bg-primary/10 font-bold">
                             <TableCell colSpan={5} className="text-center text-lg">
                               الإجمالي الكلي
                             </TableCell>
                             <TableCell className="text-lg text-primary">
                               {totalQuantity.toFixed(2)}
                             </TableCell>
                             <TableCell></TableCell>
                           </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ملخص مستحقات السائقين</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handlePrintPaymentReport} variant="outline" size="sm">
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </Button>
                    <Button onClick={handleExportPaymentToExcel} variant="outline" size="sm">
                      <Download className="h-4 w-4 ml-2" />
                      تصدير Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPaymentReport ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : paymentDrivers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>
                ) : (
                  <div className="space-y-2">
                    {paymentDrivers.map((driver) => (
                      <Collapsible
                        key={driver.id}
                        open={expandedDriverId === driver.id}
                        onOpenChange={() => toggleDriverExpansion(driver.id)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickReceipt(driver.id);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 ml-2" />
                                    سند تحويل
                                  </Button>
                                  {expandedDriverId === driver.id ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="flex gap-6">
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">المتبقي</p>
                                      <p className={`text-lg font-bold ${driver.remaining > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {driver.remaining.toFixed(2)} ريال
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">المدفوع</p>
                                      <p className="text-lg font-bold text-green-600">
                                        {driver.total_paid.toFixed(2)} ريال
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">المستحق</p>
                                      <p className="text-lg font-bold text-primary">
                                        {driver.total_due.toFixed(2)} ريال
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex-1 text-right">
                                    <h3 className="text-lg font-semibold">{driver.name}</h3>
                                    {driver.phone && (
                                      <p className="text-sm text-muted-foreground">{driver.phone}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-4 border-t">
                              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                سندات التحويل
                              </h4>
                              {receipts[driver.id]?.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>رقم السند</TableHead>
                                        <TableHead>التاريخ</TableHead>
                                        <TableHead>المبلغ</TableHead>
                                        <TableHead>الوصف</TableHead>
                                        <TableHead>الإجراءات</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {receipts[driver.id].map((receipt) => (
                                        <TableRow key={receipt.id}>
                                          <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                                          <TableCell>{new Date(receipt.transfer_date).toLocaleDateString('en-US')}</TableCell>
                                          <TableCell>{receipt.amount.toFixed(2)} ريال</TableCell>
                                          <TableCell className="max-w-[200px] truncate">{receipt.description || '-'}</TableCell>
                                          <TableCell>
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleEditReceipt(receipt)}
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                onClick={() => handleDeleteReceipt(receipt.id, driver.id, receipt.amount, receipt.transfer_date)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                  <p>لا توجد سندات تحويل لهذا السائق</p>
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Receipt Dialog */}
            <Dialog open={quickReceiptDialogOpen} onOpenChange={setQuickReceiptDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة سند تحويل سريع</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleQuickReceiptSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="receipt_number">رقم السند</Label>
                    <Input
                      id="receipt_number"
                      value={receiptFormData.receipt_number}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, receipt_number: e.target.value })}
                      required
                      placeholder="أدخل رقم السند"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">المبلغ</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={receiptFormData.amount}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, amount: e.target.value })}
                      required
                      placeholder="أدخل المبلغ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer_date">تاريخ التحويل</Label>
                    <Input
                      id="transfer_date"
                      type="date"
                      value={receiptFormData.transfer_date}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, transfer_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Input
                      id="description"
                      value={receiptFormData.description}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, description: e.target.value })}
                      placeholder="أدخل الوصف (اختياري)"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loadingPaymentReport}>إضافة</Button>
                    <Button type="button" variant="outline" onClick={() => setQuickReceiptDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Receipt Dialog */}
            <Dialog open={editReceiptDialogOpen} onOpenChange={setEditReceiptDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تعديل سند التحويل</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditReceiptSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_receipt_number">رقم السند</Label>
                    <Input
                      id="edit_receipt_number"
                      value={receiptFormData.receipt_number}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, receipt_number: e.target.value })}
                      required
                      placeholder="أدخل رقم السند"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_amount">المبلغ</Label>
                    <Input
                      id="edit_amount"
                      type="number"
                      step="0.01"
                      value={receiptFormData.amount}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, amount: e.target.value })}
                      required
                      placeholder="أدخل المبلغ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_transfer_date">تاريخ التحويل</Label>
                    <Input
                      id="edit_transfer_date"
                      type="date"
                      value={receiptFormData.transfer_date}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, transfer_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_description">الوصف</Label>
                    <Input
                      id="edit_description"
                      value={receiptFormData.description}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, description: e.target.value })}
                      placeholder="أدخل الوصف (اختياري)"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loadingPaymentReport}>حفظ التعديلات</Button>
                    <Button type="button" variant="outline" onClick={() => setEditReceiptDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="invoice-quantities">
            <Card dir="rtl">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    تقرير كميات الفواتير حسب الشركة
                  </CardTitle>
                  {invQtyRows.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleExportInvoiceQuantities} className="gap-2">
                      <Download className="h-4 w-4" />
                      تصدير Excel
                    </Button>
                  )}
                </div>
                <div className="flex items-end gap-3 flex-wrap mt-4">
                  <div className="flex flex-col gap-1">
                    <Label>من تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[180px] justify-start text-right font-normal", !invQtyFrom && "text-muted-foreground")}>
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {invQtyFrom ? format(invQtyFrom, "yyyy-MM-dd") : "اختر التاريخ"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={invQtyFrom} onSelect={setInvQtyFrom} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>إلى تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[180px] justify-start text-right font-normal", !invQtyTo && "text-muted-foreground")}>
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {invQtyTo ? format(invQtyTo, "yyyy-MM-dd") : "اختر التاريخ"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={invQtyTo} onSelect={setInvQtyTo} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={handleGenerateInvoiceQuantitiesReport} disabled={invQtyLoading}>
                    {invQtyLoading ? "جاري..." : "إنشاء التقرير"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invQtyRows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    اختر الفترة الزمنية ثم اضغط "إنشاء التقرير"
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-right">#</TableHead>
                          <TableHead className="text-right">الشركة</TableHead>
                          {invQtyTypes.map(t => (
                            <TableHead key={t} className="text-center">{t} (طن)</TableHead>
                          ))}
                          <TableHead className="text-center font-bold">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invQtyRows.map((r, i) => (
                          <TableRow key={r.companyId}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{r.companyName}</TableCell>
                            {invQtyTypes.map(t => (
                              <TableCell key={t} className="text-center">
                                {(r.quantities[t] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-bold text-primary">
                              {r.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-blue-100 font-bold">
                          <TableCell></TableCell>
                          <TableCell>الإجمالي</TableCell>
                          {invQtyTypes.map(t => {
                            const s = invQtyRows.reduce((sum, r) => sum + (r.quantities[t] || 0), 0);
                            return (
                              <TableCell key={t} className="text-center">
                                {s.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-primary">
                            {invQtyRows.reduce((sum, r) => sum + r.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LoadReports;
