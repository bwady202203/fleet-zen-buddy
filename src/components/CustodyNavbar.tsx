import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Users, FileText, List, Filter, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const CustodyNavbar = () => {
  const location = useLocation();
  
  const navItems = [
    { 
      title: 'المندوبين', 
      path: '/custody/representatives', 
      icon: Users 
    },
    { 
      title: 'سند تحويل', 
      path: '/custody/transfers', 
      icon: FileText 
    },
    { 
      title: 'العهد المستلمة', 
      path: '/custody/records', 
      icon: List 
    },
    { 
      title: 'تصفية', 
      path: '/custody/filter', 
      icon: Filter 
    },
    { 
      title: 'قيود اليومية', 
      path: '/custody/journal', 
      icon: BookOpen 
    }
  ];

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 py-3 overflow-x-auto">
          <Link to="/">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 shrink-0"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Button>
          </Link>

          <div className="h-6 w-px bg-border mx-2 shrink-0" />

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant={isActive ? "default" : "ghost"} 
                  size="sm"
                  className={cn(
                    "gap-2 shrink-0",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustodyNavbar;