import { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import AdminAIAssistant from "@/components/admin/AdminAIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface SiteConfig {
  marketplace_commission: number;
  terms_and_conditions: string;
  privacy_policy: string;
  maintenance_mode: boolean;
  featured_banner_enabled: boolean;
  featured_banner_text: string;
  featured_banner_link: string;
  contact_email: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
}

const defaultConfig: SiteConfig = {
  marketplace_commission: 5,
  terms_and_conditions: "",
  privacy_policy: "",
  maintenance_mode: false,
  featured_banner_enabled: false,
  featured_banner_text: "",
  featured_banner_link: "",
  contact_email: "",
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
};

const AdminConfig = () => {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_config")
        .select("key, value");

      if (error) throw error;

      const configMap: Record<string, unknown> = {};
      (data || []).forEach(item => {
        configMap[item.key] = item.value;
      });

      setConfig({
        marketplace_commission: (configMap.marketplace_commission as number) ?? defaultConfig.marketplace_commission,
        terms_and_conditions: (configMap.terms_and_conditions as string) ?? defaultConfig.terms_and_conditions,
        privacy_policy: (configMap.privacy_policy as string) ?? defaultConfig.privacy_policy,
        maintenance_mode: (configMap.maintenance_mode as boolean) ?? defaultConfig.maintenance_mode,
        featured_banner_enabled: (configMap.featured_banner_enabled as boolean) ?? defaultConfig.featured_banner_enabled,
        featured_banner_text: (configMap.featured_banner_text as string) ?? defaultConfig.featured_banner_text,
        featured_banner_link: (configMap.featured_banner_link as string) ?? defaultConfig.featured_banner_link,
        contact_email: (configMap.contact_email as string) ?? defaultConfig.contact_email,
        social_facebook: (configMap.social_facebook as string) ?? defaultConfig.social_facebook,
        social_instagram: (configMap.social_instagram as string) ?? defaultConfig.social_instagram,
        social_twitter: (configMap.social_twitter as string) ?? defaultConfig.social_twitter,
      });
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configEntries = Object.entries(config);
      
      for (const [key, value] of configEntries) {
        const { error } = await supabase
          .from("site_config")
          .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });

        if (error) throw error;
      }

      await logAction({
        action: "update_site_config",
        entity_type: "site_config",
        entity_id: "all",
        new_value: config as unknown as Record<string, unknown>
      });
      toast({ title: "Sucesso", description: "Configurações guardadas com sucesso" });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({ title: "Erro", description: "Não foi possível guardar as configurações", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configurações gerais da plataforma</p>
        </div>
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  const handleAIAction = async (action: any) => {
    if (action.type === 'update_config' && action.data?.key && action.data?.value !== undefined) {
      const key = action.data.key as keyof SiteConfig;
      if (key in config) {
        setConfig(prev => ({ ...prev, [key]: action.data.value }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configurações gerais da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchConfig}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "A guardar..." : "Guardar Tudo"}
          </Button>
        </div>
      </div>

      <AdminAIAssistant
        context="site_config"
        currentData={config}
        onAction={handleAIAction}
        placeholder="Ex: Muda a comissão para 3% ou ativa o banner com texto 'Promoção de Natal'"
      />

      {/* Marketplace Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplace</CardTitle>
          <CardDescription>Configurações relacionadas com vendas e comissões</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Taxa de Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.marketplace_commission}
                onChange={(e) => setConfig({ ...config, marketplace_commission: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentagem cobrada em cada venda. Alterações afetam apenas vendas futuras.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Banner em Destaque</CardTitle>
          <CardDescription>Configurar banner promocional no topo do site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Banner</Label>
              <p className="text-xs text-muted-foreground">Mostrar banner promocional no topo do site</p>
            </div>
            <Switch
              checked={config.featured_banner_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, featured_banner_enabled: checked })}
            />
          </div>
          {config.featured_banner_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Texto do Banner</Label>
                <Input
                  value={config.featured_banner_text}
                  onChange={(e) => setConfig({ ...config, featured_banner_text: e.target.value })}
                  placeholder="🎉 Promoção especial! 20% de desconto..."
                />
              </div>
              <div>
                <Label>Link do Banner</Label>
                <Input
                  value={config.featured_banner_link}
                  onChange={(e) => setConfig({ ...config, featured_banner_link: e.target.value })}
                  placeholder="/premium"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de Manutenção</CardTitle>
          <CardDescription>Ativar modo de manutenção para bloquear acesso ao site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Manutenção</Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, apenas administradores podem aceder ao site.
              </p>
            </div>
            <Switch
              checked={config.maintenance_mode}
              onCheckedChange={(checked) => setConfig({ ...config, maintenance_mode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Social */}
      <Card>
        <CardHeader>
          <CardTitle>Contacto e Redes Sociais</CardTitle>
          <CardDescription>Informações de contacto e links para redes sociais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email de Contacto</Label>
            <Input
              type="email"
              value={config.contact_email}
              onChange={(e) => setConfig({ ...config, contact_email: e.target.value })}
              placeholder="suporte@pieceswap.com"
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Facebook</Label>
              <Input
                value={config.social_facebook}
                onChange={(e) => setConfig({ ...config, social_facebook: e.target.value })}
                placeholder="https://facebook.com/pieceswap"
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={config.social_instagram}
                onChange={(e) => setConfig({ ...config, social_instagram: e.target.value })}
                placeholder="https://instagram.com/pieceswap"
              />
            </div>
            <div>
              <Label>Twitter/X</Label>
              <Input
                value={config.social_twitter}
                onChange={(e) => setConfig({ ...config, social_twitter: e.target.value })}
                placeholder="https://twitter.com/pieceswap"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle>Termos e Políticas</CardTitle>
          <CardDescription>Termos e condições e política de privacidade. Suporta formatação Markdown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Termos e Condições</Label>
            <p className="text-xs text-muted-foreground mb-2">Este conteúdo aparece na página /terms do site.</p>
            <Textarea
              className="min-h-[400px] font-mono text-sm"
              value={config.terms_and_conditions}
              onChange={(e) => setConfig({ ...config, terms_and_conditions: e.target.value })}
              placeholder="# Termos e Condições&#10;&#10;Insira os termos e condições do serviço em Markdown..."
            />
          </div>
          <Separator />
          <div>
            <Label className="text-base font-semibold">Política de Privacidade</Label>
            <p className="text-xs text-muted-foreground mb-2">Este conteúdo aparece na página /privacy do site.</p>
            <Textarea
              className="min-h-[400px] font-mono text-sm"
              value={config.privacy_policy}
              onChange={(e) => setConfig({ ...config, privacy_policy: e.target.value })}
              placeholder="# Política de Privacidade&#10;&#10;Insira a política de privacidade em Markdown..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConfig;
