import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
}

export function usePermissions() {
  const { session } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    fetchUserPermissions();
  }, [session]);

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          role_id,
          roles!inner (
            role_permissions (
              permissions (
                id,
                name,
                code,
                description,
                category
              )
            )
          )
        `)
        .eq('id', session?.user?.id)
        .single();

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

      if (data?.roles?.role_permissions) {
        const userPermissions = data.roles.role_permissions
          .map((rp: any) => rp.permissions)
          .filter(Boolean);
        
        setPermissions(userPermissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = useCallback((permissionCode: string): boolean => {
    return permissions.some(p => p.code === permissionCode);
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.some(code => hasPermission(code));
  }, [hasPermission]);

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
  };
}