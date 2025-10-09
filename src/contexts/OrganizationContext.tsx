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
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          organizations!inner (
            id,
            name,
            name_en,
            is_active,
            database_initialized
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading organizations:', error);
        setOrganizations([]);
        return;
      }

      if (!data || data.length === 0) {
        setOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      const orgs: Organization[] = data
        .map(item => {
          const org = item.organizations;
          if (!org || typeof org !== 'object' || Array.isArray(org)) return null;
          
          return {
            id: String(org.id),
            name: String(org.name),
            name_en: org.name_en ? String(org.name_en) : undefined,
            is_active: Boolean(org.is_active),
            database_initialized: Boolean(org.database_initialized)
          } as Organization;
        })
        .filter((org): org is Organization => org !== null);
      
      setOrganizations(orgs);

      // Set first organization as current if none selected
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      if (savedOrgId && orgs.find(org => org.id === savedOrgId)) {
        const savedOrg = orgs.find(org => org.id === savedOrgId);
        if (savedOrg) setCurrentOrganization(savedOrg);
      } else if (orgs.length > 0) {
        setCurrentOrganization(orgs[0]);
        localStorage.setItem('currentOrganizationId', orgs[0].id);
      }
    } catch (err) {
      console.error('Exception loading organizations:', err);
      setOrganizations([]);
    }
  };

  const createOrganization = async (name: string, nameEn?: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
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
    } catch (err) {
      return { error: err };
    }
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
