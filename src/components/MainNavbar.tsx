import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Calculator, Users, Truck, Package, Wallet, LogOut, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const MainNavbar = () => {
  const location = useLocation();
  const { signOut, user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allNavItems = [
    { title: 'الرئيسية', path: '/', icon: Home, module: null },
    { title: 'المحاسبة', path: '/accounting', icon: Calculator, module: 'accounting' },
    { title: 'الموارد البشرية', path: '/hr', icon: Users, module: 'hr' },
    { title: 'الأسطول', path: '/fleet', icon: Truck, module: 'fleet' },
    { title: 'الحمولات', path: '/loads', icon: Package, module: 'loads' },
    { title: 'العهد', path: '/custody', icon: Wallet, module: 'custody' },
  ];

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter(item => {
    if (!item.module) return true; // Always show home
    return hasPermission(item.module, 'view');
  });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16" dir="rtl">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Home className="h-6 w-6" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-xl">نظام الإدارة المتكامل</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 text-primary-foreground hover:bg-white/20",
                      active && "bg-white/30 font-semibold"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                <div className="hidden md:flex flex-col items-end ml-4">
                  <span className="text-sm font-medium">{user.email}</span>
                  {userRole && (
                    <span className="text-xs opacity-80">
                      {userRole === 'admin' ? 'مسؤول' : 
                       userRole === 'manager' ? 'مدير' :
                       userRole === 'accountant' ? 'محاسب' : 'مستخدم'}
                    </span>
                  )}
                </div>

                {userRole === 'admin' && (
                  <Link to="/users">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-primary-foreground hover:bg-white/20"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="hidden md:inline">المستخدمين</span>
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-2 text-primary-foreground hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">خروج</span>
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-primary-foreground hover:bg-white/20"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 pt-2 border-t border-white/20">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 text-primary-foreground hover:bg-white/20",
                        active && "bg-white/30 font-semibold"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Button>
                  </Link>
                );
              })}
              
              {user && userRole === 'admin' && (
                <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-primary-foreground hover:bg-white/20"
                  >
                    <Shield className="h-4 w-4" />
                    <span>إدارة المستخدمين</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default MainNavbar;