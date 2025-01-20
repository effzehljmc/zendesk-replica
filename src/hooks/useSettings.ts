import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type SystemSetting = {
  id: string;
  key: string;
  value: any;
  description: string | null;
  created_at: string;
  updated_at: string;
  updated_by_id: string | null;
};

export function useSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .order('key');

      if (fetchError) throw fetchError;
      setSettings(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (!profile) throw new Error('Not authenticated');

    try {
      const { error: updateError } = await supabase
        .from('settings')
        .update({
          value,
          updated_at: new Date().toISOString(),
          updated_by_id: profile.id,
        })
        .eq('key', key);

      if (updateError) throw updateError;
      await fetchSettings(); // Refresh settings after update
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const createSetting = async (key: string, value: any, description?: string) => {
    if (!profile) throw new Error('Not authenticated');

    try {
      const { error: createError } = await supabase
        .from('settings')
        .insert({
          key,
          value,
          description,
          updated_by_id: profile.id,
        });

      if (createError) throw createError;
      await fetchSettings(); // Refresh settings after creation
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteSetting = async (key: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('settings')
        .delete()
        .eq('key', key);

      if (deleteError) throw deleteError;
      await fetchSettings(); // Refresh settings after deletion
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSetting,
    createSetting,
    deleteSetting,
    refreshSettings: fetchSettings,
  };
} 