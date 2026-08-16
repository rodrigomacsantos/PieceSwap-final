import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'moderator' | 'support';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } else {
        setRoles((data || []).map((r: any) => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRoles();
    }
  }, [authLoading, fetchRoles]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  
  const hasAnyRole = useCallback((checkRoles: AppRole[]) => 
    checkRoles.some(role => roles.includes(role)), [roles]);

  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator') || isAdmin;
  const isSupport = hasRole('support') || isModerator;
  const hasAdminAccess = roles.length > 0;

  // Permission helpers
  const canManageUsers = isAdmin || isModerator;
  const canManageListings = isAdmin || isModerator;
  const canManageReports = hasAdminAccess;
  const canManageSwapCoins = isAdmin;
  const canManageConfig = isAdmin;
  const canExportData = isAdmin;
  const canManageSubscriptions = isAdmin;

  return {
    roles,
    loading: authLoading || loading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isSupport,
    hasAdminAccess,
    canManageUsers,
    canManageListings,
    canManageReports,
    canManageSwapCoins,
    canManageConfig,
    canExportData,
    canManageSubscriptions,
    refetch: fetchRoles,
  };
};
