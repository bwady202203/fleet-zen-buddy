import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  name_en?: string;
  is_active: boolean;
  database_initialized: boolean;
  address?: string;
  tax_number?: string;
  commercial_registration?: string;
  phone?: string;
  email?: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization) => void;
  loadOrganizations: () => Promise<void>;
  createOrganization: (data: Partial<Organization>) => Promise<{ error: any }>;
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<{ error: any }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const loadOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    const { data, error } = await supabase
      .from('user_organizations')
      .select('organization_id, organizations(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading organizations:', error);
      return;
    }

    const orgs = data?.map(item => item.organizations as any).filter(Boolean) || [];
    setOrganizations(orgs);

    const savedOrgId = localStorage.getItem('currentOrganizationId');
    if (savedOrgId && orgs.find((org: any) => org.id === savedOrgId)) {
      const savedOrg = orgs.find((org: any) => org.id === savedOrgId);
      if (savedOrg) setCurrentOrganization(savedOrg as Organization);
    } else if (orgs.length > 0) {
      setCurrentOrganization(orgs[0] as Organization);
      localStorage.setItem('currentOrganizationId', orgs[0].id);
    }
  };

  const createOrganization = async (data: Partial<Organization>) => {
    if (!user) return { error: 'User not authenticated' };

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([data as any])
      .select()
      .single();

    if (orgError) return { error: orgError };

    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({ user_id: user.id, organization_id: org.id });

    if (userOrgError) return { error: userOrgError };

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ 
        user_id: user.id, 
        role: 'admin',
        organization_id: org.id 
      });

    if (roleError) return { error: roleError };

    await loadOrganizations();
    return { error: null };
  };

  const updateOrganization = async (id: string, data: Partial<Organization>) => {
    const { error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', id);

    if (!error) {
      await loadOrganizations();
    }

    return { error };
  };

  useEffect(() => {
    loadOrganizations();
  }, [user?.id]);

  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('currentOrganizationId', currentOrganization.id);
    }
  }, [currentOrganization?.id]);

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      setCurrentOrganization,
      loadOrganizations,
      createOrganization,
      updateOrganization
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
