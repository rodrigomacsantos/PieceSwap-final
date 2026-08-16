import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useCategoryFollows = () => {
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFollows = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('category_follows')
      .select('category')
      .eq('user_id', user.id);
    setFollowedCategories(data?.map(d => d.category) || []);
  };

  useEffect(() => {
    fetchFollows();
  }, [user]);

  const toggleFollow = async (category: string) => {
    if (!user) return;
    setLoading(true);
    try {
      if (followedCategories.includes(category)) {
        await supabase
          .from('category_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('category', category);
        setFollowedCategories(prev => prev.filter(c => c !== category));
        toast({ title: 'Deixaste de seguir', description: `Já não recebes alertas de "${category}".` });
      } else {
        await supabase
          .from('category_follows')
          .insert({ user_id: user.id, category });
        setFollowedCategories(prev => [...prev, category]);
        toast({ title: 'A seguir!', description: `Receberás alertas quando houver novos anúncios em "${category}".` });
      }
    } catch (error) {
      console.error('Error toggling category follow:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFollowing = (category: string) => followedCategories.includes(category);

  return { followedCategories, isFollowing, toggleFollow, loading, fetchFollows };
};
