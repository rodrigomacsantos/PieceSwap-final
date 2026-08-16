import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_swapcoins: number;
  status: string;
  seller_message: string | null;
  created_at: string;
  updated_at: string;
  listing?: {
    title: string;
    images: string[] | null;
    price_swap_coins: number | null;
  };
  buyer?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useOffers = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const createOffer = async (listingId: string, sellerId: string, amount: number): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('offers').insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        amount_swapcoins: amount,
      }).select('id').single();
      if (error) throw error;
      toast({ title: 'Oferta enviada!', description: 'O vendedor será notificado da tua proposta.' });
      return data.id;
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a oferta.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedOffers = useCallback(async (): Promise<Offer[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with listing and buyer info
      const enriched = await Promise.all(
        (data || []).map(async (offer) => {
          const [{ data: listing }, { data: buyer }] = await Promise.all([
            supabase.from('listings').select('title, images, price_swap_coins').eq('id', offer.listing_id).maybeSingle(),
            (supabase as any).from('public_profiles').select('full_name, username, avatar_url').eq('id', offer.buyer_id).maybeSingle(),
          ]);
          return { ...offer, listing, buyer } as Offer;
        })
      );
      return enriched;
    } catch (error) {
      console.error('Error fetching received offers:', error);
      return [];
    }
  }, [user]);

  const fetchSentOffers = useCallback(async (): Promise<Offer[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (offer) => {
          const { data: listing } = await supabase
            .from('listings')
            .select('title, images, price_swap_coins')
            .eq('id', offer.listing_id)
            .maybeSingle();
          return { ...offer, listing } as Offer;
        })
      );
      return enriched;
    } catch (error) {
      console.error('Error fetching sent offers:', error);
      return [];
    }
  }, [user]);

  const updateOfferStatus = async (offerId: string, status: 'accepted' | 'rejected', message?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status, seller_message: message || null, updated_at: new Date().toISOString() })
        .eq('id', offerId);
      if (error) throw error;
      toast({
        title: status === 'accepted' ? 'Oferta aceite!' : 'Oferta recusada',
        description: status === 'accepted' ? 'O comprador será notificado.' : 'O comprador foi informado.',
      });
      return true;
    } catch (error) {
      console.error('Error updating offer:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a oferta.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createOffer, fetchReceivedOffers, fetchSentOffers, updateOfferStatus, loading };
};
