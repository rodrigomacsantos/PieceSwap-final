import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSwipe = () => {
  const [config, setConfig] = useState({
    daily_swipe_limit_free: 20,
    daily_superlike_limit_free: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await (supabase.from("site_config" as any) as any)
        .select("key, value")
        .in("key", Object.keys(config));

      if (data) {
        const newConfig = { ...config };
        data.forEach((item: any) => {
          if (item.key in newConfig) {
            (newConfig as any)[item.key] = parseInt(JSON.parse(item.value));
          }
        });
        setConfig(newConfig);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        await (supabase.from("site_config" as any) as any)
          .update({ value: JSON.stringify(value) })
          .eq("key", key);
      }

      await logAction({
        action: "update_swipe_config",
        entity_type: "config",
        new_value: config,
      });

      toast({ title: "Configurações guardadas", description: "As alterações foram aplicadas." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Swipe & Matching</h1>
        <p className="text-muted-foreground">Configurar limites de swipes para utilizadores gratuitos. Os limites premium são definidos por plano na página de Subscrições.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Limites Diários (Plano Gratuito)</CardTitle>
          <CardDescription>Define os limites para utilizadores sem subscrição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Swipes (Free)</Label>
              <Input
                type="number"
                min="0"
                value={config.daily_swipe_limit_free}
                onChange={(e) => setConfig({ ...config, daily_swipe_limit_free: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Superlikes (Free)</Label>
              <Input
                type="number"
                min="0"
                value={config.daily_superlike_limit_free}
                onChange={(e) => setConfig({ ...config, daily_superlike_limit_free: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os limites de swipes e superlikes para utilizadores premium são configurados individualmente em cada plano na página de Subscrições.
          </p>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSwipe;
