import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileSpreadsheet, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYROLL_URL = "https://pay-buddy-app-51.lovable.app/auth";

export default function PayrollApp() {
  const [frameKey, setFrameKey] = useState(0);

  return (
    <section className="flex min-w-0 flex-col bg-background" dir="rtl">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="الرجوع للرئيسية" title="الرجوع للرئيسية">
            <Link to="/"><ArrowRight className="h-5 w-5" /></Link>
          </Button>
          <FileSpreadsheet className="h-6 w-6 shrink-0 text-primary" />
          <h1 className="text-lg font-bold">برنامج الرواتب</h1>
        </div>
        <Button variant="outline" size="icon" aria-label="إعادة تحميل برنامج الرواتب" title="إعادة تحميل برنامج الرواتب" onClick={() => setFrameKey((key) => key + 1)}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </header>
      <iframe
        key={frameKey}
        src={PAYROLL_URL}
        title="برنامج الرواتب"
        className="h-[calc(100dvh-10rem)] min-h-[420px] w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </section>
  );
}