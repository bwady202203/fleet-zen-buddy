import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ModulePermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermissionsContextType {
  permissions: ModulePermission[];
  loading: boolean;
  hasPermission: (moduleName: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (user && userRole !== 'admin') {
      fetchPermissions();
    } else {
      setLoading(false);
      // Admin has all permissions
      if (userRole === 'admin') {
        setPermissions([]);
      }
    }
  }, [user, userRole]);

  const fetchPermissions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } else {
        const mappedPermissions: ModulePermission[] = (data || []).map(d => ({
          module_name: d.module_name,
          can_view: d.can_view ?? false,
          can_create: d.can_create ?? false,
          can_edit: d.can_edit ?? false,
          can_delete: d.can_delete ?? false,
        }));
        setPermissions(mappedPermissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (moduleName: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    // Admin has all permissions
    if (userRole === 'admin') {
      return true;
    }

    const permission = permissions.find(p => p.module_name === moduleName);
    if (!permission) {
      return false;
    }

    switch (action) {
      case 'view':
        return permission.can_view;
      case 'create':
        return permission.can_create;
      case 'edit':
        return permission.can_edit;
      case 'delete':
        return permission.can_delete;
      default:
        return false;
    }
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};
