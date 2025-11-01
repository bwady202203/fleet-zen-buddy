import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Upload, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { supabase } from "@/integrations/supabase/client";

interface SparePartRow {
  code: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  purchaseInvoice: string;
  location?: string;
}

const BulkSpareParts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { spareParts } = useSpareParts();
  const [rows, setRows] = useState<SparePartRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const lines = pastedData.split('\n').filter(line => line.trim());
    
    const parsedRows: SparePartRow[] = lines.map(line => {
      const cells = line.split('\t');
      return {
        code: cells[0]?.trim() || '',
        name: cells[1]?.trim() || '',
        category: cells[2]?.trim() || '',
        quantity: parseInt(cells[3]?.trim() || '0'),
        unitPrice: parseFloat(cells[4]?.trim() || '0'),
        purchaseInvoice: cells[5]?.trim() || '',
        location: cells[6]?.trim() || '',
      };
    }).filter(row => row.code && row.name);

    setRows(parsedRows);
    toast({
      title: "تم اللصق",
      description: `تم لصق ${parsedRows.length} صف`,
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rows.length === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء لصق البيانات أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      for (const row of rows) {
        // البحث عن قطعة غيار موجودة بنفس الكود
        const { data: existingParts } = await supabase
          .from('spare_parts')
          .select('*')
          .eq('code', row.code)
          .eq('organization_id', orgData?.organization_id);

        const existingPart = existingParts?.[0];

        if (existingPart) {
          // تحديث الكمية للقطعة الموجودة
          const newQuantity = existingPart.quantity + row.quantity;
          
          await supabase
            .from('spare_parts')
            .update({ 
              quantity: newQuantity,
              unit_price: row.unitPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPart.id);

          // تسجيل عملية الشراء
          await supabase
            .from('spare_parts_purchases')
            .insert({
              spare_part_id: existingPart.id,
              quantity: row.quantity,
              unit_price: row.unitPrice,
              total_price: row.quantity * row.unitPrice,
              purchase_date: new Date().toISOString().split('T')[0],
              invoice_number: row.purchaseInvoice,
              supplier: 'مورد',
              organization_id: orgData?.organization_id,
            });

          // تسجيل حركة المخزون
          await supabase
            .from('stock_transactions')
            .insert({
              spare_part_id: existingPart.id,
              type: 'in',
              quantity: row.quantity,
              transaction_date: new Date().toISOString().split('T')[0],
              reference_type: 'purchase',
              notes: `فاتورة: ${row.purchaseInvoice}`,
              organization_id: orgData?.organization_id,
            });
        } else {
          // إضافة قطعة غيار جديدة
          const { data: newPart } = await supabase
            .from('spare_parts')
            .insert({
              code: row.code,
              name: row.name,
              category: row.category,
              quantity: row.quantity,
              unit_price: row.unitPrice,
              location: row.location || '',
              min_quantity: 5,
              organization_id: orgData?.organization_id,
            })
            .select()
            .single();

          if (newPart) {
            // تسجيل عملية الشراء
            await supabase
              .from('spare_parts_purchases')
              .insert({
                spare_part_id: newPart.id,
                quantity: row.quantity,
                unit_price: row.unitPrice,
                total_price: row.quantity * row.unitPrice,
                purchase_date: new Date().toISOString().split('T')[0],
                invoice_number: row.purchaseInvoice,
                supplier: 'مورد',
                organization_id: orgData?.organization_id,
              });

            // تسجيل حركة المخزون
            await supabase
              .from('stock_transactions')
              .insert({
                spare_part_id: newPart.id,
                type: 'in',
                quantity: row.quantity,
                transaction_date: new Date().toISOString().split('T')[0],
                reference_type: 'purchase',
                notes: `فاتورة: ${row.purchaseInvoice}`,
                organization_id: orgData?.organization_id,
              });
          }
        }
      }

      toast({
        title: "نجح الحفظ",
        description: `تم إضافة/تحديث ${rows.length} قطعة غيار`,
      });

      navigate('/spare-parts');
    } catch (error) {
      console.error('Error saving spare parts:', error);
      toast({
        title: "خطأ",
        description: "فشل حفظ قطع الغيار",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">إضافة قطع غيار متعددة</h1>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting || rows.length === 0}>
              <Save className="h-4 w-4 ml-2" />
              حفظ الكل
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>إرشادات اللصق من Excel</CardTitle>
            <CardDescription>
              الصق البيانات من Excel بالترتيب التالي: الكود - الاسم - الفئة - الكمية - سعر الوحدة - رقم الفاتورة - الموقع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="paste-area">منطقة اللصق</Label>
                <textarea
                  id="paste-area"
                  className="w-full min-h-[100px] p-3 border rounded-md"
                  placeholder="الصق هنا من Excel (Ctrl+V)..."
                  onPaste={handlePaste}
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>
                  إذا كانت قطعة الغيار موجودة مسبقاً (بنفس الكود)، سيتم زيادة الكمية فقط
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>البيانات المحملة ({rows.length} قطعة)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">الموقع</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const existingPart = spareParts.find(p => p.code === row.code);
                      return (
                        <TableRow key={index} className={existingPart ? "bg-blue-50 dark:bg-blue-950" : ""}>
                          <TableCell>{row.code}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.quantity}</TableCell>
                          <TableCell>{row.unitPrice} ر.س</TableCell>
                          <TableCell>{row.purchaseInvoice}</TableCell>
                          <TableCell>{row.location}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <span className="inline-block w-4 h-4 bg-blue-100 dark:bg-blue-950 ml-2 align-middle"></span>
                قطع الغيار المُظللة موجودة مسبقاً وسيتم تحديث كميتها فقط
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default BulkSpareParts;
