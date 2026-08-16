import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteConfig {
  marketplace_commission: number;
  featured_banner_enabled: boolean;
  featured_banner_text: string;
  featured_banner_link: string;
  maintenance_mode: boolean;
}

const defaults: SiteConfig = {
  marketplace_commission: 5,
  featured_banner_enabled: false,
  featured_banner_text: "",
  featured_banner_link: "",
  maintenance_mode: false,
};

export const useSiteConfig = () => {
  const [config, setConfig] = useState<SiteConfig>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from("site_config")
          .select("key, value")
          .in("key", [
            "marketplace_commission",
            "featured_banner_enabled",
            "featured_banner_text",
            "featured_banner_link",
            "maintenance_mode",
          ]);

        if (data) {
          const map: Record<string, unknown> = {};
          data.forEach((r) => (map[r.key] = r.value));
          setConfig({
            marketplace_commission: (map.marketplace_commission as number) ?? defaults.marketplace_commission,
            featured_banner_enabled: (map.featured_banner_enabled as boolean) ?? defaults.featured_banner_enabled,
            featured_banner_text: (map.featured_banner_text as string) ?? defaults.featured_banner_text,
            featured_banner_link: (map.featured_banner_link as string) ?? defaults.featured_banner_link,
            maintenance_mode: (map.maintenance_mode as boolean) ?? defaults.maintenance_mode,
          });
        }
      } catch (e) {
        console.error("Error fetching site config:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { config, loading };
};
