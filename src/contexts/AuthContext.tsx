import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  currentOrganizationId: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchCurrentOrganization(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setCurrentOrganizationId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchCurrentOrganization(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } else if (data && data.length > 0) {
        // If user has multiple roles, prioritize: admin > manager > accountant > user
        const rolePriority: Record<string, number> = {
          'admin': 4,
          'manager': 3,
          'accountant': 2,
          'user': 1
        };
        
        const highestRole = data.reduce((highest, current) => {
          const currentPriority = rolePriority[current.role] || 0;
          const highestPriority = rolePriority[highest.role] || 0;
          return currentPriority > highestPriority ? current : highest;
        });
        
        setUserRole(highestRole.role);
        console.log('User role fetched:', highestRole.role);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  const fetchCurrentOrganization = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current organization:', error);
        setCurrentOrganizationId(null);
        return;
      }

      setCurrentOrganizationId(data?.organization_id || null);
    } catch (error) {
      console.error('Error in fetchCurrentOrganization:', error);
      setCurrentOrganizationId(null);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setCurrentOrganizationId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, currentOrganizationId, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
