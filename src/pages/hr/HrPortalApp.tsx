import { Link } from "react-router-dom";
import { ArrowRight, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const HR_URL = "https://wisehrsuite.store";

const HrPortalApp = () => {
  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      <header className="border-b bg-card shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">برنامج الموارد البشرية</h1>
                <p className="text-xs text-muted-foreground">يعمل داخل النظام الحالي</p>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={HR_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">فتح في نافذة جديدة</span>
            </a>
          </Button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <iframe
          src={HR_URL}
          title="برنامج الموارد البشرية"
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      </main>
    </div>
  );
};

export default HrPortalApp;
