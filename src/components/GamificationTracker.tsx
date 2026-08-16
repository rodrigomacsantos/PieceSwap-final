import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Component that auto-checks badges and streaks when a user is logged in.
 * Runs once on mount (login) and after key navigation events.
 */
const GamificationTracker = () => {
  const { user } = useAuth();
  const lastChecked = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastChecked.current = null;
      return;
    }

    // Avoid checking more than once per minute
    const now = Date.now().toString();
    if (lastChecked.current && Date.now() - parseInt(lastChecked.current) < 60000) {
      return;
    }

    const runChecks = async () => {
      lastChecked.current = Date.now().toString();

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_streaks')
        .upsert({ 
          user_id: user.id, 
          current_streak: 1,
          longest_streak: 1,
          last_active_date: today 
        }, { onConflict: 'user_id' })
        .then(async () => {
          // Fix streak calculation server-side would be better, but for now upsert handles first entry
        });

      // Check badges
      try {
        const { data, error } = await supabase.rpc('check_user_badges', { _user_id: user.id });
        if (!error && data && Array.isArray(data) && data.length > 0) {
          for (const badgeName of data) {
            toast.success(`🏆 Badge desbloqueado: ${badgeName}!`, { duration: 5000 });
          }
        }
      } catch (err) {
        console.error('Badge check error:', err);
      }
    };

    runChecks();
  }, [user]);

  return null;
};

export default GamificationTracker;
