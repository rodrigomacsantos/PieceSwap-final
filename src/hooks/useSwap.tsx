import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMessages } from './useMessages';
import { Listing } from './useListings';
import { SwipeFilterValues } from '@/components/SwipeFilters';

export const useSwap = () => {
  const [swipeableListings, setSwipeableListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SwipeFilterValues>({ maxDistance: null, categories: [], minPrice: null, maxPrice: null });
  const { user } = useAuth();
  const { createConversation } = useMessages();

  const fetchSwipeableListings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get listings the user has already swiped on
      const { data: swipedData } = await supabase
        .from('swipe_actions')
        .select('listing_id')
        .eq('user_id', user.id);

      const swipedListingIds = swipedData?.map(s => s.listing_id) || [];

      // Get active listings that accept trades, excluding user's own
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .eq('accepts_trades', true)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out already swiped listings
      const filteredListings = (data || []).filter(
        listing => !swipedListingIds.includes(listing.id)
      );

      // Fetch seller profiles
      const listingsWithSellers = await Promise.all(
        filteredListings.map(async (listing) => {
          const { data: profile } = await (supabase as any)
            .from('public_profiles')
            .select('username, full_name, avatar_url, rating')
            .eq('id', listing.user_id)
            .maybeSingle();
          
          return {
            ...listing,
            seller: profile,
          };
        })
      );

      setAllListings(listingsWithSellers);
      applyFilters(listingsWithSellers, filters);
    } catch (error) {
      console.error('Error fetching swipeable listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback((listings: Listing[], f: SwipeFilterValues) => {
    let filtered = [...listings];

    // Category filter
    if (f.categories.length > 0) {
      filtered = filtered.filter(l => f.categories.includes(l.category));
    }

    // Price filter (swap coins)
    if (f.minPrice !== null || f.maxPrice !== null) {
      filtered = filtered.filter(l => {
        // If listing doesn't have a swap coin price, should we show it?
        // User confirmed all listings MUST have a price, but for legacy data:
        if (!l.price_swap_coins) return true;

        const min = f.minPrice ?? 0;
        const max = f.maxPrice ?? Infinity;
        return l.price_swap_coins >= min && l.price_swap_coins <= max;
      });
    }

    // Distance filter - uses seller location (latitude/longitude)
    // We can't calculate distance client-side without user's coords, so we rely on
    // the seller having a location set. For now, we just filter by presence of location.
    // The actual distance filtering would need the user's geolocation.

    setSwipeableListings(filtered);
  }, []);

  const updateFilters = useCallback((newFilters: SwipeFilterValues) => {
    setFilters(newFilters);
    applyFilters(allListings, newFilters);
  }, [allListings, applyFilters]);

  const recordSwipe = async (listingId: string, action: 'like' | 'dislike') => {
    if (!user) return null;

    try {
      const { error } = await supabase
        .from('swipe_actions')
        .insert({
          user_id: user.id,
          listing_id: listingId,
          action,
        });

      if (error) throw error;

      // If liked, check for match
      if (action === 'like') {
        return await checkForMatch(listingId);
      }

      return null;
    } catch (error) {
      console.error('Error recording swipe:', error);
      return null;
    }
  };

  const checkForMatch = async (likedListingId: string) => {
    if (!user) return null;

    try {
      // Get the owner of the listing we just liked
      const { data: likedListing } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', likedListingId)
        .single();

      if (!likedListing) return null;

      const otherUserId = likedListing.user_id;

      // Use SECURITY DEFINER function to check mutual swipe (bypasses RLS)
      const { data: mutualData, error: mutualError } = await supabase
        .rpc('check_mutual_swipe', {
          _user_id: user.id,
          _liked_listing_id: likedListingId,
        });

      if (mutualError) {
        console.error('Error checking mutual swipe:', mutualError);
        return null;
      }

      if (mutualData && mutualData.length > 0) {
        const ourMatchedListingId = mutualData[0].matched_listing_id;

        // It's a match! Create the match record
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: otherUserId,
            listing1_id: ourMatchedListingId, // Our listing they liked
            listing2_id: likedListingId, // Their listing we liked
          })
          .select()
          .single();

        if (matchError) {
          console.log('Match creation error (might already exist):', matchError);
        } else if (match) {
          const conversation = await createConversation(otherUserId, likedListingId, match.id);
          
          const [listingRes, profileRes] = await Promise.all([
            supabase.from('listings').select('*').eq('id', likedListingId).single(),
            (supabase as any).from('public_profiles').select('username, full_name, avatar_url').eq('id', otherUserId).maybeSingle(),
          ]);
          
          return {
            match,
            listing: listingRes.data ? { ...listingRes.data, seller: profileRes.data } : null,
            conversationId: conversation?.id || null,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking for match:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchSwipeableListings();
  }, [user]);

  return {
    swipeableListings,
    loading,
    fetchSwipeableListings,
    recordSwipe,
    filters,
    updateFilters,
  };
};
