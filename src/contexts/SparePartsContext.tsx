import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface SparePart {
  id: string;
  name: string;
  price: number;
  quantity: number;
  minQuantity: number;
  unit: string;
}

export interface Purchase {
  id: string;
  date: string;
  spareParts: { sparePartId: string; quantity: number; price: number }[];
  totalCost: number;
  supplier: string;
  notes: string;
}

interface SparePartsContextType {
  spareParts: SparePart[];
  purchases: Purchase[];
  addSparePart: (part: Omit<SparePart, "id">) => void;
  updateSparePart: (id: string, part: Partial<SparePart>) => void;
  deleteSparePart: (id: string) => void;
  addPurchase: (purchase: Omit<Purchase, "id">) => void;
  deductQuantity: (sparePartId: string, quantity: number) => boolean;
}

const SparePartsContext = createContext<SparePartsContextType | undefined>(undefined);

export const SparePartsProvider = ({ children }: { children: ReactNode }) => {
  const [spareParts, setSpareParts] = useState<SparePart[]>(() => {
    const saved = localStorage.getItem("spareParts");
    return saved ? JSON.parse(saved) : [
      { id: "1", name: "فلتر زيت", price: 50, quantity: 25, minQuantity: 10, unit: "قطعة" },
      { id: "2", name: "زيت محرك", price: 120, quantity: 30, minQuantity: 15, unit: "لتر" },
      { id: "3", name: "إطارات", price: 800, quantity: 12, minQuantity: 8, unit: "قطعة" },
      { id: "4", name: "فرامل", price: 300, quantity: 20, minQuantity: 10, unit: "طقم" },
      { id: "5", name: "بطارية", price: 650, quantity: 8, minQuantity: 5, unit: "قطعة" },
      { id: "6", name: "فلتر هواء", price: 80, quantity: 18, minQuantity: 10, unit: "قطعة" },
      { id: "7", name: "شمعات", price: 45, quantity: 40, minQuantity: 20, unit: "قطعة" },
      { id: "8", name: "مساحات", price: 120, quantity: 15, minQuantity: 8, unit: "زوج" },
    ];
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem("purchases");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("spareParts", JSON.stringify(spareParts));
  }, [spareParts]);

  useEffect(() => {
    localStorage.setItem("purchases", JSON.stringify(purchases));
  }, [purchases]);

  const addSparePart = (part: Omit<SparePart, "id">) => {
    const newPart: SparePart = {
      ...part,
      id: Date.now().toString(),
    };
    setSpareParts((prev) => [...prev, newPart]);
  };

  const updateSparePart = (id: string, part: Partial<SparePart>) => {
    setSpareParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...part } : p))
    );
  };

  const deleteSparePart = (id: string) => {
    setSpareParts((prev) => prev.filter((p) => p.id !== id));
  };

  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now().toString(),
    };
    setPurchases((prev) => [...prev, newPurchase]);

    // إضافة الكميات المشتراة إلى المخزون
    purchase.spareParts.forEach((item) => {
      setSpareParts((prev) =>
        prev.map((part) =>
          part.id === item.sparePartId
            ? { ...part, quantity: part.quantity + item.quantity }
            : part
        )
      );
    });
  };

  const deductQuantity = (sparePartId: string, quantity: number): boolean => {
    const part = spareParts.find((p) => p.id === sparePartId);
    if (!part || part.quantity < quantity) {
      return false;
    }

    setSpareParts((prev) =>
      prev.map((p) =>
        p.id === sparePartId ? { ...p, quantity: p.quantity - quantity } : p
      )
    );
    return true;
  };

  return (
    <SparePartsContext.Provider
      value={{
        spareParts,
        purchases,
        addSparePart,
        updateSparePart,
        deleteSparePart,
        addPurchase,
        deductQuantity,
      }}
    >
      {children}
    </SparePartsContext.Provider>
  );
};

export const useSpareParts = () => {
  const context = useContext(SparePartsContext);
  if (!context) {
    throw new Error("useSpareParts must be used within SparePartsProvider");
  }
  return context;
};
