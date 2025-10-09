import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  name_en?: string;
  is_active: boolean;
  database_initialized: boolean;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization) => void;
  loadOrganizations: () => Promise<void>;
  createOrganization: (name: string, nameEn?: string) => Promise<{ error: any }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const loadOrganizations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_organizations')
      .select('organization_id, organizations(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading organizations:', error);
      return;
    }

    const orgs = data?.map(item => item.organizations).filter(Boolean) as Organization[];
    setOrganizations(orgs);

    // Set first organization as current if none selected
    if (!currentOrganization && orgs.length > 0) {
      setCurrentOrganization(orgs[0]);
      localStorage.setItem('currentOrganizationId', orgs[0].id);
    }
  };

  const createOrganization = async (name: string, nameEn?: string) => {
    if (!user) return { error: 'User not authenticated' };

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, name_en: nameEn })
      .select()
      .single();

    if (orgError) return { error: orgError };

    // Add user to organization
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({ user_id: user.id, organization_id: org.id });

    if (userOrgError) return { error: userOrgError };

    // Add admin role for this organization
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

  useEffect(() => {
    if (user) {
      loadOrganizations();
      
      // Try to restore last selected organization
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      if (savedOrgId) {
        const savedOrg = organizations.find(org => org.id === savedOrgId);
        if (savedOrg) setCurrentOrganization(savedOrg);
      }
    }
  }, [user]);

  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('currentOrganizationId', currentOrganization.id);
    }
  }, [currentOrganization]);

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      setCurrentOrganization,
      loadOrganizations,
      createOrganization
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
