import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, ShoppingCart, Trash2, Plus, Minus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function PurchasePOS() {
  const navigate = useNavigate();
  const { spareParts, addPurchase } = useSpareParts();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);

  const filteredParts = spareParts.filter(
    (part) =>
      part.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (part: typeof spareParts[0]) => {
    const existingItem = cart.find((item) => item.id === part.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: part.id,
          name: part.name,
          price: part.price || 0,
          quantity: 1,
        },
      ]);
    }
    toast.success(`تمت إضافة ${part.name} للسلة`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updatePrice = (id: string, newPrice: number) => {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, price: newPrice } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.success("تم حذف المنتج من السلة");
  };

  const clearCart = () => {
    setCart([]);
    setSupplierName("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setInvoiceNumber(`INV-${Date.now()}`);
    toast.success("تم تفريغ السلة");
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCompletePurchase = async () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    if (!supplierName.trim()) {
      toast.error("يرجى إدخال اسم المورد");
      return;
    }

    console.log("Attempting purchase with data:", {
      date: purchaseDate,
      supplier: supplierName,
      spareParts: cart.map((item) => ({
        sparePartId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      totalCost: totalAmount,
    });

    try {
      await addPurchase({
        date: purchaseDate,
        supplier: supplierName,
        notes: "",
        spareParts: cart.map((item) => ({
          sparePartId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        totalCost: totalAmount,
      });

      toast.success("تمت عملية الشراء بنجاح");
      clearCart();
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error(`حدث خطأ أثناء عملية الشراء: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/purchases")}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">نقطة بيع قطع الغيار</h1>
                <p className="text-sm text-muted-foreground">
                  اختر المنتجات وأضفها للسلة
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <ShoppingCart className="ml-2 h-5 w-5" />
              {cart.length} منتج
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="ابحث عن قطعة غيار بالاسم أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12 text-lg"
              />
            </div>

            {/* Products Grid */}
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {filteredParts.map((part) => (
                  <Card
                    key={part.id}
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => addToCart(part)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">
                            {part.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            السعر
                          </span>
                          <span className="text-xl font-bold text-primary">
                            {part.price?.toFixed(2)} ر.س
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            المخزون
                          </span>
                          <Badge
                            variant={
                              part.quantity <= part.minQuantity
                                ? "destructive"
                                : "default"
                            }
                          >
                            {part.quantity} قطعة
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredParts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    لا توجد قطع غيار مطابقة للبحث
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>سلة الشراء</span>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 ml-1" />
                      تفريغ
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invoice Number */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    رقم الفاتورة
                  </label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="رقم الفاتورة"
                  />
                </div>

                {/* Date Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    تاريخ الشراء
                  </label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>

                {/* Supplier Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    اسم المورد
                  </label>
                  <Input
                    placeholder="أدخل اسم المورد"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Cart Items */}
                <ScrollArea className="h-[calc(100vh-520px)]">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">السلة فارغة</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-muted/50 rounded-lg space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-12 text-center font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) =>
                                    updatePrice(item.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 h-7 text-xs text-left"
                                />
                                <span className="text-xs">×</span>
                                <span className="text-xs">{item.quantity}</span>
                              </div>
                              <p className="font-bold text-primary mt-1">
                                {(item.price * item.quantity).toFixed(2)} ر.س
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <Separator />

                {/* Total */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium">المجموع الكلي</span>
                    <span className="text-2xl font-bold text-primary">
                      {totalAmount.toFixed(2)} ر.س
                    </span>
                  </div>

                  <Button
                    className="w-full h-12 text-lg"
                    disabled={cart.length === 0 || !supplierName.trim()}
                    onClick={handleCompletePurchase}
                  >
                    <Save className="ml-2 h-5 w-5" />
                    إتمام عملية الشراء
                  </Button>
                  {cart.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      أضف منتجات إلى السلة أولاً
                    </p>
                  )}
                  {cart.length > 0 && !supplierName.trim() && (
                    <p className="text-xs text-destructive text-center mt-2">
                      يرجى إدخال اسم المورد
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
