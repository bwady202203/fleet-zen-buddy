import AccountingPageHeader from "@/components/accounting/AccountingPageHeader";
import { useCrusherProgram } from "@/lib/crusherProgram";
import { Link } from "react-router-dom";
import { ArrowRight, ListOrdered } from "lucide-react";
import CrusherShipmentsList from "@/components/crusher/CrusherShipmentsList";

export default function CrusherShipments() {
  const prog = useCrusherProgram();
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        {prog.key === "samman" ? (<div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={prog.base} className="hover:text-primary"><ArrowRight className="h-6 w-6" /></Link>
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><ListOrdered className="h-5 w-5" /></div>
          <div><h1 className="text-lg font-bold">عرض الشحنات</h1><p className="text-xs text-muted-foreground">{prog.name}</p></div>
        </div>) : (<div className="container mx-auto px-4 py-3"><AccountingPageHeader title={<>عرض الشحنات</>} titleClassName="text-lg font-bold" description={<p className="text-xs text-muted-foreground">{prog.name}</p>} icon={<><div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><ListOrdered className="h-5 w-5" /></div></>} /></div>)}
      </header>
      <main className="container mx-auto px-4 py-6"><CrusherShipmentsList refreshKey={0} /></main>
    </div>
  );
}
