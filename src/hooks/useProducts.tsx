import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  image_url: string;
  price_eur: number;
  swapcoins_amount: number;
  bonus_coins: number;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from("swapcoins_packages")
          .select("*")
          .eq("is_active", true)
          .order("price_eur", { ascending: true });

        if (error) throw error;

        setProducts(
          (data || []).map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            image_url: "",
            price_eur: Number(pkg.price_eur),
            swapcoins_amount: pkg.coins + (pkg.bonus_coins || 0),
            bonus_coins: pkg.bonus_coins || 0,
          }))
        );
      } catch (error) {
        console.error("Error fetching swapcoins packages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  return { products, loading };
};
