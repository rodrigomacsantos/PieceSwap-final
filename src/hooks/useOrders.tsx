import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  amount_swapcoins: number;
  status: 'pending' | 'shipped' | 'completed' | 'cancelled';
  shipping_address: {
    street: string;
    city: string;
    zip: string;
    country: string;
  } | null;
  created_at: string;
  updated_at: string;
  listing?: {
    title: string;
    images: string[] | null;
    category: string;
  } | null;
  buyer_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  seller_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useOrders = () => {
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch purchases
      const { data: purchaseData, error: pErr } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;

      // Fetch sales
      const { data: salesData, error: sErr } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (sErr) throw sErr;

      const allOrderIds = [...(purchaseData || []), ...(salesData || [])];
      const listingIds = [...new Set(allOrderIds.map(o => o.listing_id))];
      const userIds = [...new Set(allOrderIds.flatMap(o => [o.buyer_id, o.seller_id]))];

      // Fetch listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, images, category')
        .in('id', listingIds.length ? listingIds : ['none']);

      // Fetch profiles
      const { data: profilesData } = await (supabase as any)
        .from('public_profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds.length ? userIds : ['none']);

      const listingsMap = Object.fromEntries((listingsData || []).map(l => [l.id, l]));
      const profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));

      const enrichOrder = (o: any): Order => ({
        ...o,
        listing: listingsMap[o.listing_id] || null,
        buyer_profile: profilesMap[o.buyer_id] || null,
        seller_profile: profilesMap[o.seller_id] || null,
      });

      setPurchases((purchaseData || []).map(enrichOrder));
      setSales((salesData || []).map(enrichOrder));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const processPurchase = async (
    sellerId: string,
    listingId: string,
    amount: number,
    shippingAddress: { street: string; city: string; zip: string; country: string },
    saveAddress: boolean
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('process_purchase', {
        p_buyer_id: user.id,
        p_seller_id: sellerId,
        p_listing_id: listingId,
        p_amount: amount,
        p_shipping_address: shippingAddress,
      });

      if (error) throw error;

      if (saveAddress) {
        await supabase
          .from('profiles')
          .update({
            address_street: shippingAddress.street,
            address_city: shippingAddress.city,
            address_zip: shippingAddress.zip,
            address_country: shippingAddress.country,
          })
          .eq('id', user.id);
      }

      toast({
        title: "Compra realizada! 🎉",
        description: `Foram debitados ${amount} SC. O vendedor receberá ${Math.round(amount * 0.95)} SC quando confirmares a receção.`,
      });

      return data;
    } catch (error: any) {
      const msg = error?.message || 'Erro ao processar compra';
      toast({
        title: "Erro na compra",
        description: msg.includes('Insufficient') ? 'Saldo de SwapCoins insuficiente.' : msg,
        variant: "destructive",
      });
      return null;
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase.rpc('cancel_order', {
        p_order_id: orderId,
        p_user_id: user.id,
      });
      if (error) throw error;

      toast({
        title: "Encomenda cancelada",
        description: "O saldo foi devolvido (pode ter sido aplicada uma penalização). O artigo foi reativado.",
      });
      await fetchOrders();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível cancelar.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!user) return false;
    try {
      if (status === 'completed') {
        // Use the complete_order RPC to release escrow
        const { error } = await supabase.rpc('complete_order', {
          p_order_id: orderId,
          p_user_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);
        if (error) throw error;
      }

      const statusMessages: Record<string, string> = {
        shipped: "Encomenda marcada como enviada!",
        completed: "Receção confirmada! O pagamento foi libertado ao vendedor.",
      };

      toast({
        title: statusMessages[status] || "Estado atualizado",
      });
      await fetchOrders();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o estado.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    purchases,
    sales,
    loading,
    fetchOrders,
    processPurchase,
    cancelOrder,
    updateOrderStatus,
  };
};
