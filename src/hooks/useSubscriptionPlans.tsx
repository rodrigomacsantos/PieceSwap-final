import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  name: string;
  price: number;
  daily_superlike_limit: number;
  daily_swipe_limit: number; // 0 = unlimited
  can_highlight: boolean;
  priority_boost: number; // 0 = none
  active: boolean;
}

// Helper to generate human-readable features list from structured plan
export const getPlanFeatures = (plan: SubscriptionPlan): string[] => {
  const features: string[] = [];
  if (plan.daily_swipe_limit === 0) {
    features.push("Swipes ilimitados");
  } else {
    features.push(`${plan.daily_swipe_limit} swipes por dia`);
  }
  if (plan.daily_superlike_limit > 0) {
    features.push(`${plan.daily_superlike_limit} Superlike${plan.daily_superlike_limit > 1 ? 's' : ''} por dia`);
  }
  if (plan.can_highlight) {
    features.push("Destaque de anúncios no Marketplace");
  }
  if (plan.priority_boost > 0) {
    features.push("Prioridade no sistema de Swap");
  }
  return features;
};

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const parsePlans = (value: unknown): SubscriptionPlan[] => {
    if (!Array.isArray(value)) return [];
    return value.map((p: any) => ({
      name: p.name || '',
      price: p.price || 0,
      daily_superlike_limit: p.daily_superlike_limit ?? (p.features ? 1 : 0),
      daily_swipe_limit: p.daily_swipe_limit ?? 0,
      can_highlight: p.can_highlight ?? true,
      priority_boost: p.priority_boost ?? 2,
      active: p.active ?? true,
    }));
  };

  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "subscription_plans")
        .single();

      if (data?.value) {
        const allPlans = parsePlans(data.value);
        setPlans(allPlans.filter(p => p.active));
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();

    const channel = supabase
      .channel('subscription-plans')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_config' },
        (payload) => {
          const row = payload.new as { key: string; value: unknown } | undefined;
          if (row && row.key === 'subscription_plans') {
            const allPlans = parsePlans(row.value);
            setPlans(allPlans.filter(p => p.active));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { plans, loading };
};
