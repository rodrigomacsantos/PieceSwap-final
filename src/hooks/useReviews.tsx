import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useReviews = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserReviews = async (userId: string): Promise<Review[]> => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reviewer profiles
      if (data && data.length > 0) {
        const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
        const { data: profiles } = await (supabase as any)
          .from('public_profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', reviewerIds);

        const profileMap = new Map<string, any>(((profiles as any[]) || []).map((p: any) => [p.id, p]));

        return data.map(r => ({
          ...r,
          reviewer: profileMap.get(r.reviewer_id) || undefined,
        })) as Review[];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  };

  const hasReviewedOrder = async (orderId: string): Promise<boolean> => {
    if (!user) return false;
    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('reviewer_id', user.id);
    return (count || 0) > 0;
  };

  const submitReview = async (orderId: string, reviewedId: string, rating: number, comment: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          reviewer_id: user.id,
          reviewed_id: reviewedId,
          rating,
          comment: comment || null,
        });

      if (error) throw error;

      toast({
        title: 'Avaliação enviada!',
        description: 'Obrigado pelo teu feedback.',
      });
      return true;
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Erro',
        description: error.message?.includes('unique') ? 'Já avaliaste esta encomenda.' : 'Não foi possível enviar a avaliação.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { fetchUserReviews, hasReviewedOrder, submitReview, loading };
};
