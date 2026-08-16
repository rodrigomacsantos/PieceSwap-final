import { useState, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  swap_coins: number;
  rating: number | null;
  total_ratings: number | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_country: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProfile = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      setLoading(false);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      
      if (!userId || userId === user?.id) {
        setProfile(data);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const profileUpdateSchema = z.object({
    username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres').max(30, 'Username deve ter no máximo 30 caracteres').regex(/^[a-zA-Z0-9_]+$/, 'Username só pode conter letras, números e underscores').optional(),
    full_name: z.string().min(1).max(100, 'Nome deve ter no máximo 100 caracteres').optional().nullable(),
    bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional().nullable(),
    location: z.string().max(100, 'Localização deve ter no máximo 100 caracteres').optional().nullable(),
    avatar_url: z.string().url('URL de avatar inválida').optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    address_street: z.string().max(200).optional().nullable(),
    address_city: z.string().max(100).optional().nullable(),
    address_zip: z.string().max(20).optional().nullable(),
    address_country: z.string().max(100).optional().nullable(),
    onboarding_completed: z.boolean().optional(),
    referral_code: z.string().max(20).optional().nullable(),
  });

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return null;

    try {
      // Strip protected fields that users should never update directly
      const { swap_coins, pending_swap_coins, rating, total_ratings, id, created_at, updated_at, ...safeUpdates } = updates as any;
      
      const validatedUpdates = profileUpdateSchema.parse(safeUpdates);

      const { data, error } = await supabase
        .from('profiles')
        .update(validatedUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      toast({
        title: "Perfil atualizado!",
        description: "As alterações foram guardadas.",
      });
      
      return data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error updating profile:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o perfil.",
          variant: "destructive",
        });
      }
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  return {
    profile,
    loading,
    fetchProfile,
    updateProfile,
  };
};
