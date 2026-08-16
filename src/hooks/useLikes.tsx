import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useLikes = () => {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchLikes = useCallback(async () => {
    if (!user) {
      setLikedIds(new Set());
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('listing_likes')
      .select('listing_id')
      .eq('user_id', user.id);
    setLikedIds(new Set((data || []).map(d => d.listing_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  const toggleLike = async (listingId: string): Promise<boolean> => {
    if (!user) return false;
    const isLiked = likedIds.has(listingId);

    if (isLiked) {
      setLikedIds(prev => { const s = new Set(prev); s.delete(listingId); return s; });
      await supabase.from('listing_likes').delete().eq('user_id', user.id).eq('listing_id', listingId);
      return false;
    } else {
      setLikedIds(prev => new Set(prev).add(listingId));
      await supabase.from('listing_likes').insert({ user_id: user.id, listing_id: listingId });
      return true;
    }
  };

  const isLiked = (listingId: string) => likedIds.has(listingId);

  const fetchLikedListings = async () => {
    if (!user) return [];
    const { data: likes } = await supabase
      .from('listing_likes')
      .select('listing_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!likes || likes.length === 0) return [];

    const ids = likes.map(l => l.listing_id);
    const { data: listings } = await supabase
      .from('listings')
      .select('*')
      .in('id', ids);

    // Maintain order from likes
    const listingsMap = new Map((listings || []).map(l => [l.id, l]));
    return ids.map(id => listingsMap.get(id)).filter(Boolean);
  };

  return { isLiked, toggleLike, loading, fetchLikedListings };
};
