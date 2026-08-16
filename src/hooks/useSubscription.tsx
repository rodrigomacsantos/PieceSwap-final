import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  price_eur: number;
  started_at: string;
  expires_at: string | null;
}

interface DailySwipes {
  swipe_count: number;
  swipe_date: string;
}

interface DailySuperlikes {
  used_count: number;
  superlike_date: string;
}

interface PlanCapabilities {
  daily_superlike_limit: number;
  daily_swipe_limit: number; // 0 = unlimited
  can_highlight: boolean;
  priority_boost: number;
}

interface FreeLimits {
  daily_swipe_limit_free: number;
  daily_superlike_limit_free: number;
}

const DEFAULT_FREE_LIMITS: FreeLimits = {
  daily_swipe_limit_free: 20,
  daily_superlike_limit_free: 0,
};

const DEFAULT_PLAN_CAPS: PlanCapabilities = {
  daily_superlike_limit: 1,
  daily_swipe_limit: 0, // unlimited
  can_highlight: true,
  priority_boost: 2,
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [dailySwipes, setDailySwipes] = useState<DailySwipes | null>(null);
  const [dailySuperlikes, setDailySuperlikes] = useState<DailySuperlikes | null>(null);
  const [freeLimits, setFreeLimits] = useState<FreeLimits>(DEFAULT_FREE_LIMITS);
  const [planCaps, setPlanCaps] = useState<PlanCapabilities>(DEFAULT_PLAN_CAPS);
  const [loading, setLoading] = useState(true);

  const isPremium = subscription?.plan !== 'free' && subscription?.plan != null && subscription?.status === 'active';
  const freeSwipeLimit = freeLimits.daily_swipe_limit_free;
  
  const swipesRemaining = isPremium 
    ? (planCaps.daily_swipe_limit === 0 ? Infinity : planCaps.daily_swipe_limit - (dailySwipes?.swipe_count || 0))
    : freeSwipeLimit - (dailySwipes?.swipe_count || 0);
  const canSwipe = swipesRemaining > 0;
  
  const superlikesRemaining = isPremium 
    ? planCaps.daily_superlike_limit - (dailySuperlikes?.used_count || 0)
    : 0 - (dailySuperlikes?.used_count || 0); // handles referral bonus superlikes
  const canSuperlike = superlikesRemaining > 0;

  // Fetch free tier limits from site_config
  const fetchFreeLimits = async () => {
    try {
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['daily_swipe_limit_free', 'daily_superlike_limit_free']);

      if (data) {
        const newLimits = { ...DEFAULT_FREE_LIMITS };
        data.forEach((item) => {
          const key = item.key as keyof FreeLimits;
          if (key in newLimits) {
            newLimits[key] = typeof item.value === 'number' ? item.value : parseInt(String(item.value)) || DEFAULT_FREE_LIMITS[key];
          }
        });
        setFreeLimits(newLimits);
      }
    } catch (error) {
      console.error('Error fetching free limits:', error);
    }
  };

  // Fetch user's specific plan capabilities
  const fetchPlanCapabilities = async (planName: string) => {
    try {
      const { data } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'subscription_plans')
        .single();

      if (data?.value && Array.isArray(data.value)) {
        const plan = (data.value as any[]).find(
          (p) => p.name?.toLowerCase() === planName.toLowerCase() && p.active
        );
        if (plan) {
          setPlanCaps({
            daily_superlike_limit: plan.daily_superlike_limit ?? DEFAULT_PLAN_CAPS.daily_superlike_limit,
            daily_swipe_limit: plan.daily_swipe_limit ?? DEFAULT_PLAN_CAPS.daily_swipe_limit,
            can_highlight: plan.can_highlight ?? DEFAULT_PLAN_CAPS.can_highlight,
            priority_boost: plan.priority_boost ?? DEFAULT_PLAN_CAPS.priority_boost,
          });
          return;
        }
      }
      // Fallback for legacy "premium" plan name
      setPlanCaps(DEFAULT_PLAN_CAPS);
    } catch (error) {
      console.error('Error fetching plan capabilities:', error);
    }
  };

  useEffect(() => {
    fetchFreeLimits();

    const channel = supabase
      .channel('swipe-limits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_config' },
        (payload) => {
          const row = payload.new as { key: string; value: unknown } | undefined;
          if (row && row.key in DEFAULT_FREE_LIMITS) {
            setFreeLimits(prev => ({
              ...prev,
              [row.key]: typeof row.value === 'number' ? row.value : parseInt(String(row.value)) || prev[row.key as keyof FreeLimits],
            }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchDailySwipes();
      fetchDailySuperlikes();
    } else {
      setSubscription(null);
      setDailySwipes(null);
      setDailySuperlikes(null);
      setLoading(false);
    }
  }, [user]);

  // When subscription changes, fetch plan-specific capabilities
  useEffect(() => {
    if (subscription?.plan && subscription.plan !== 'free' && subscription.status === 'active') {
      fetchPlanCapabilities(subscription.plan);
    }
  }, [subscription?.plan, subscription?.status]);

  const fetchSubscription = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!error && data) {
      setSubscription(data as Subscription);
    } else {
      setSubscription(null);
    }
    setLoading(false);
  };

  const fetchDailySwipes = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_swipes')
      .select('*')
      .eq('user_id', user.id)
      .eq('swipe_date', today)
      .maybeSingle();
    if (!error && data) {
      setDailySwipes(data as DailySwipes);
    }
  };

  const fetchDailySuperlikes = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_superlikes')
      .select('*')
      .eq('user_id', user.id)
      .eq('superlike_date', today)
      .maybeSingle();
    if (!error && data) {
      setDailySuperlikes(data as DailySuperlikes);
    }
  };

  const recordSwipe = async () => {
    if (!user || !canSwipe) return false;
    const today = new Date().toISOString().split('T')[0];
    
    if (dailySwipes) {
      const { error } = await supabase
        .from('daily_swipes')
        .update({ swipe_count: dailySwipes.swipe_count + 1 })
        .eq('user_id', user.id)
        .eq('swipe_date', today);
      if (!error) {
        setDailySwipes({ ...dailySwipes, swipe_count: dailySwipes.swipe_count + 1 });
        return true;
      }
    } else {
      const { error } = await supabase
        .from('daily_swipes')
        .insert({ user_id: user.id, swipe_date: today, swipe_count: 1 });
      if (!error) {
        setDailySwipes({ swipe_date: today, swipe_count: 1 });
        return true;
      }
    }
    return false;
  };

  const useSuperlike = async (listingId: string) => {
    if (!user || !canSuperlike) return false;
    const today = new Date().toISOString().split('T')[0];

    const { error: superlikeError } = await supabase
      .from('superlikes')
      .insert({ user_id: user.id, listing_id: listingId });
    if (superlikeError) return false;

    if (dailySuperlikes) {
      await supabase
        .from('daily_superlikes')
        .update({ used_count: dailySuperlikes.used_count + 1 })
        .eq('user_id', user.id)
        .eq('superlike_date', today);
      setDailySuperlikes({ ...dailySuperlikes, used_count: dailySuperlikes.used_count + 1 });
    } else {
      await supabase
        .from('daily_superlikes')
        .insert({ user_id: user.id, superlike_date: today, used_count: 1 });
      setDailySuperlikes({ superlike_date: today, used_count: 1 });
    }
    return true;
  };

  const subscribeToPremium = async (planName: string = 'premium', price: number = 14.99) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'subscribe', planName, price },
      });

      if (error) {
        console.error('Subscription error:', error);
        return false;
      }

      await fetchSubscription();
      return true;
    } catch (error) {
      console.error('Subscription error:', error);
      return false;
    }
  };

  const cancelSubscription = async () => {
    if (!user || !subscription) return false;

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel' },
      });

      if (error) {
        console.error('Cancel subscription error:', error);
        return false;
      }

      await fetchSubscription();
      return true;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return false;
    }
  };

  return {
    subscription,
    isPremium,
    planName: subscription?.plan || 'free',
    planCaps,
    canHighlight: isPremium && planCaps.can_highlight,
    loading,
    swipesRemaining,
    freeSwipeLimit,
    canSwipe,
    superlikesRemaining,
    canSuperlike,
    recordSwipe,
    useSuperlike,
    subscribeToPremium,
    cancelSubscription,
    refetch: fetchSubscription,
  };
};
