import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  module: string;
}

const PermissionProtectedRoute = ({ children, module }: PermissionProtectedRouteProps) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission(module, 'view')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PermissionProtectedRoute;
