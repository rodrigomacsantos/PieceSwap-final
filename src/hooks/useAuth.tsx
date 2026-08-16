import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SUSPENDED_ERROR = 'A tua conta foi suspensa. Contacta o suporte para mais informações.';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  swapcoins: number;
  pendingSwapcoins: number;
  refreshBalance: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: { username?: string; full_name?: string }) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [swapcoins, setSwapcoins] = useState(0);
  const [pendingSwapcoins, setPendingSwapcoins] = useState(0);

  const fetchBalance = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('swap_coins, pending_swap_coins')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setSwapcoins(data?.swap_coins || 0);
      setPendingSwapcoins((data as any)?.pending_swap_coins || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (user) {
      await fetchBalance(user.id);
    }
  }, [user, fetchBalance]);

  const suspensionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const checkSuspensionAndLogout = useCallback(async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('is_suspended, suspended_reason')
      .eq('id', userId)
      .maybeSingle();
    if (data?.is_suspended) {
      await supabase.auth.signOut();
      toast({
        title: 'Conta suspensa',
        description: data.suspended_reason
          ? `${SUSPENDED_ERROR} Motivo: ${data.suspended_reason}`
          : SUSPENDED_ERROR,
        variant: 'destructive',
      });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchBalance(currentUser.id);
          setTimeout(() => { checkSuspensionAndLogout(currentUser.id); }, 0);
        } else {
          setSwapcoins(0);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchBalance(currentUser.id);
        checkSuspensionAndLogout(currentUser.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchBalance, checkSuspensionAndLogout]);

  useEffect(() => {
    if (suspensionChannelRef.current) {
      supabase.removeChannel(suspensionChannelRef.current);
      suspensionChannelRef.current = null;
    }
    if (!user) return;
    const channel = supabase
      .channel(`suspension-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newRow = payload.new as { is_suspended?: boolean; suspended_reason?: string | null };
          if (newRow?.is_suspended) {
            supabase.auth.signOut();
            toast({
              title: 'Conta suspensa',
              description: newRow.suspended_reason
                ? `${SUSPENDED_ERROR} Motivo: ${newRow.suspended_reason}`
                : SUSPENDED_ERROR,
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();
    suspensionChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      suspensionChannelRef.current = null;
    };
  }, [user]);

  const signUp = async (email: string, password: string, metadata?: { username?: string; full_name?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error: error as Error | null };
  };

  const signIn = async (identifier: string, password: string) => {
    // If it's an email, sign in directly client-side
    if (identifier.includes('@')) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      if (error) return { error: error as Error };
      // Check suspension
      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_suspended, suspended_reason')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profile?.is_suspended) {
          await supabase.auth.signOut();
          const msg = profile.suspended_reason
            ? `${SUSPENDED_ERROR} Motivo: ${profile.suspended_reason}`
            : SUSPENDED_ERROR;
          return { error: new Error(msg) };
        }
      }
      return { error: null };
    }

    // For username login, use server-side function (email never reaches client)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('login-with-username', {
        body: { identifier, password },
      });

      if (data?.error === 'account_suspended') {
        const msg = data.reason
          ? `${SUSPENDED_ERROR} Motivo: ${data.reason}`
          : SUSPENDED_ERROR;
        return { error: new Error(msg) };
      }

      if (fnError || data?.error) {
        return { error: new Error(data?.error || "Invalid login credentials") };
      }

      if (!data?.access_token || !data?.refresh_token) {
        return { error: new Error("Invalid login credentials") };
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      return { error: sessionError as Error | null };
    } catch (error) {
      console.error('Error in username login:', error);
      return { error: new Error("Erro ao fazer login.") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, swapcoins, pendingSwapcoins, refreshBalance, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
