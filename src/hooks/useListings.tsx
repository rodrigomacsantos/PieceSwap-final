import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  set_number: string | null;
  quantity: number;
  price_eur: number | null;
  price_swap_coins: number | null;
  accepts_trades: boolean;
  allows_offers: boolean;
  images: string[];
  status: string;
  created_at: string;
  updated_at: string;
  boosted_at: string | null;
  boost_expires_at: string | null;
  boost_cost_sc: number;
  seller?: {
    id?: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    location?: string | null;
    created_at?: string;
  } | null;
}

export const useListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchListings = async (includeOwn: boolean = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('listings')
        .select('*')
        .neq('status', 'deleted') // Always exclude deleted listings
        .order('created_at', { ascending: false });

      // Only filter by active status if not including own listings
      if (!includeOwn) {
        query = query.eq('status', 'active');
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch seller profiles separately
      const listingsWithSellers = await Promise.all(
        (data || []).map(async (listing) => {
          const { data: profile } = await (supabase as any)
            .from('public_profiles')
            .select('id, username, full_name, avatar_url, rating, location, created_at')
            .eq('id', listing.user_id)
            .maybeSingle();
          
          return {
            ...listing,
            seller: profile,
          };
        })
      );

      setListings(listingsWithSellers);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserListings = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'deleted') // Exclude deleted listings
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user listings:', error);
      return [];
    }
  }, []);

  const fetchListing = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .neq('status', 'deleted') // Exclude deleted listings
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const { data: profile } = await (supabase as any)
          .from('public_profiles')
          .select('id, username, full_name, avatar_url, rating, location, created_at')
          .eq('id', data.user_id)
          .maybeSingle();
        
        return {
          ...data,
          seller: profile,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  }, []);

  const createListing = async (listingData: Omit<Listing, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'seller'>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Tens de estar autenticado para criar anúncios.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          ...listingData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Anúncio criado!",
        description: "O teu anúncio está agora visível no marketplace.",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o anúncio. Tenta novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return {
    listings,
    loading,
    fetchListings,
    fetchUserListings,
    fetchListing,
    createListing,
  };
};
