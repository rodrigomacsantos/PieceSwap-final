import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  swapcoins_reward: number;
  is_active: boolean;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
}

export interface UserXP {
  total_xp: number;
  level: number;
}

export interface DailyStreak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  xp_reward: number;
  swapcoins_reward: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  progress?: number;
  completed?: boolean;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Novato',
  2: 'Iniciante',
  3: 'Aprendiz',
  4: 'Conhecedor',
  5: 'Experiente',
  6: 'Veterano',
  7: 'Expert',
  8: 'Mestre',
  9: 'Grão-Mestre',
  10: 'Lenda',
};

const XP_PER_LEVEL = 100;

export const getLevelName = (level: number) => LEVEL_NAMES[Math.min(level, 10)] || 'Lenda Suprema';
export const getXPForLevel = (level: number) => level * XP_PER_LEVEL;
export const getXPProgress = (totalXP: number, level: number) => {
  const currentLevelXP = (level - 1) * XP_PER_LEVEL;
  const nextLevelXP = level * XP_PER_LEVEL;
  return ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
};

export const useGamification = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [xp, setXP] = useState<UserXP>({ total_xp: 0, level: 1 });
  const [streak, setStreak] = useState<DailyStreak>({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const hasCheckedBadges = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const [badgesRes, userBadgesRes, xpRes, streakRes, challengesRes] = await Promise.all([
      supabase.from('badges').select('*').eq('is_active', true),
      supabase.from('user_badges').select('*').eq('user_id', user.id),
      supabase.from('user_xp').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('daily_streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('weekly_challenges').select('*').eq('is_active', true),
    ]);

    setBadges((badgesRes.data || []) as Badge[]);
    setUserBadges((userBadgesRes.data || []) as UserBadge[]);
    
    if (xpRes.data) {
      setXP({ total_xp: xpRes.data.total_xp, level: xpRes.data.level });
    }
    if (streakRes.data) {
      setStreak({
        current_streak: streakRes.data.current_streak,
        longest_streak: streakRes.data.longest_streak,
        last_active_date: streakRes.data.last_active_date,
      });
    }

    // Fetch challenge progress
    if (challengesRes.data && challengesRes.data.length > 0) {
      const progressRes = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', challengesRes.data.map(c => c.id));

      const progressMap = new Map((progressRes.data || []).map((p: any) => [p.challenge_id, p]));
      
      setChallenges(challengesRes.data.map(c => ({
        ...c,
        progress: (progressMap.get(c.id) as any)?.current_value || 0,
        completed: (progressMap.get(c.id) as any)?.completed || false,
      })) as WeeklyChallenge[]);
    }

    setLoading(false);
  }, [user]);

  // Check and award badges via DB function
  const checkBadges = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('check_user_badges', { _user_id: user.id });
      
      if (error) {
        console.error('Error checking badges:', error);
        return;
      }

      // Show toast for each newly awarded badge
      if (data && Array.isArray(data) && data.length > 0) {
        for (const badgeName of data) {
          toast.success(`🏆 Badge desbloqueado: ${badgeName}!`, {
            duration: 5000,
          });
        }
        // Refresh data to show new badges
        await fetchAll();
      }
    } catch (err) {
      console.error('Error checking badges:', err);
    }
  }, [user, fetchAll]);

  // Update streak
  const updateStreak = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    if (streak.last_active_date === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = streak.last_active_date === yesterday ? streak.current_streak + 1 : 1;
    const newLongest = Math.max(newStreak, streak.longest_streak);

    const { error } = await supabase
      .from('daily_streaks')
      .upsert({ 
        user_id: user.id, 
        current_streak: newStreak, 
        longest_streak: newLongest, 
        last_active_date: today 
      }, { onConflict: 'user_id' });

    if (!error) {
      setStreak({ current_streak: newStreak, longest_streak: newLongest, last_active_date: today });
    }
  }, [user, streak]);

  // Fetch data on mount
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-check badges and update streak on login (once per session)
  useEffect(() => {
    if (user && !loading && !hasCheckedBadges.current) {
      hasCheckedBadges.current = true;
      updateStreak();
      checkBadges();
    }
  }, [user, loading, checkBadges, updateStreak]);

  // Reset ref when user changes
  useEffect(() => {
    hasCheckedBadges.current = false;
  }, [user?.id]);

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
  const hasBadge = (badgeId: string) => earnedBadgeIds.has(badgeId);

  return {
    badges,
    userBadges,
    xp,
    streak,
    challenges,
    loading,
    checkBadges,
    updateStreak,
    hasBadge,
    earnedBadgeIds,
    refetch: fetchAll,
  };
};
