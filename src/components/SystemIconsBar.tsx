import { Calculator, Users, Package, Truck, Wallet, Home } from "lucide-react";
import { Link } from "react-router-dom";

export const SystemIconsBar = () => {
  return (
    <div className="border-b bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الرئيسية</span>
          </Link>
          
          <Link to="/accounting" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">المحاسبة</span>
          </Link>
          
          <Link to="/hr" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الموارد البشرية</span>
          </Link>
          
          <Link to="/fleet" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الأسطول</span>
          </Link>
          
          <Link to="/loads" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الحمولات</span>
          </Link>
          
          <Link to="/custody" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">العهد</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
