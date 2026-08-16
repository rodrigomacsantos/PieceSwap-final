import { useState } from "react";
import { Download, FileSpreadsheet, Users, Package, ShoppingCart, AlertCircle, Database, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type ExportType = "users" | "listings" | "transactions" | "reports" | "full_backup";

const BACKUP_TABLES = [
  "profiles",
  "listings",
  "orders",
  "sales_commissions",
  "subscriptions",
  "swapcoins_packages",
  "reviews",
  "reports",
  "matches",
  "user_roles",
  "site_config",
  "audit_logs",
] as const;

const AdminExports = () => {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const { canExportData } = useAdminAuth();
  const { logAction } = useAuditLog();
  const { toast } = useToast();

  const formatCSVValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") {
      if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }
    if (typeof value === "object") {
      return JSON.stringify(value).replace(/"/g, '""');
    }
    return String(value);
  };

  const downloadCSV = (data: Record<string, unknown>[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => formatCSVValue(row[h])).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDateFilter = () => {
    if (dateRange === "all") return null;
    const days = parseInt(dateRange);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const exportUsers = async () => {
    setExporting("users");
    try {
      let query = supabase
        .from("profiles")
        .select("id, username, full_name, location, rating, total_ratings, swap_coins, created_at, updated_at, is_suspended");

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const sanitizedData = (data || []).map(user => ({
        id: user.id,
        username: user.username || "",
        full_name: user.full_name || "",
        location: user.location || "",
        rating: user.rating || 0,
        total_ratings: user.total_ratings || 0,
        swap_coins: user.swap_coins,
        created_at: user.created_at,
        is_suspended: user.is_suspended ? "Sim" : "Não"
      }));

      downloadCSV(sanitizedData, "utilizadores", [
        "id", "username", "full_name", "location", "rating", "total_ratings", "swap_coins", "created_at", "is_suspended"
      ]);

      await logAction({
        action: "export_users",
        entity_type: "export",
        entity_id: "users",
        new_value: { count: sanitizedData.length, date_range: dateRange }
      });
      toast({ title: "Sucesso", description: `${sanitizedData.length} utilizadores exportados` });
    } catch (error) {
      console.error("Error exporting users:", error);
      toast({ title: "Erro", description: "Não foi possível exportar os utilizadores", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportListings = async () => {
    setExporting("listings");
    try {
      let query = supabase
        .from("listings")
        .select("id, title, category, condition, price_eur, price_swap_coins, status, created_at, updated_at, user_id");

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      downloadCSV(data || [], "anuncios", [
        "id", "title", "category", "condition", "price_eur", "price_swap_coins", "status", "created_at", "updated_at", "user_id"
      ]);

      await logAction({
        action: "export_listings",
        entity_type: "export",
        entity_id: "listings",
        new_value: { count: (data || []).length, date_range: dateRange }
      });
      toast({ title: "Sucesso", description: `${(data || []).length} anúncios exportados` });
    } catch (error) {
      console.error("Error exporting listings:", error);
      toast({ title: "Erro", description: "Não foi possível exportar os anúncios", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportTransactions = async () => {
    setExporting("transactions");
    try {
      let query = supabase
        .from("sales_commissions")
        .select("id, listing_id, seller_id, buyer_id, sale_price_eur, commission_rate, commission_amount, status, created_at");

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      downloadCSV(data || [], "transacoes", [
        "id", "listing_id", "seller_id", "buyer_id", "sale_price_eur", "commission_rate", "commission_amount", "status", "created_at"
      ]);

      await logAction({
        action: "export_transactions",
        entity_type: "export",
        entity_id: "transactions",
        new_value: { count: (data || []).length, date_range: dateRange }
      });
      toast({ title: "Sucesso", description: `${(data || []).length} transações exportadas` });
    } catch (error) {
      console.error("Error exporting transactions:", error);
      toast({ title: "Erro", description: "Não foi possível exportar as transações", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportReports = async () => {
    setExporting("reports");
    try {
      let query = (supabase.from("reports") as any)
        .select("id, report_type, reason, status, created_at, updated_at, resolved_at, reporter_id, reported_user_id, reported_listing_id");

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      downloadCSV(data || [], "denuncias", [
        "id", "report_type", "reason", "status", "created_at", "updated_at", "resolved_at", "reporter_id", "reported_user_id", "reported_listing_id"
      ]);

      await logAction({
        action: "export_reports",
        entity_type: "export",
        entity_id: "reports",
        new_value: { count: (data || []).length, date_range: dateRange }
      });
      toast({ title: "Sucesso", description: `${(data || []).length} denúncias exportadas` });
    } catch (error) {
      console.error("Error exporting reports:", error);
      toast({ title: "Erro", description: "Não foi possível exportar as denúncias", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportFullBackup = async () => {
    setExporting("full_backup");
    try {
      const snapshot: Record<string, unknown> = {
        meta: {
          generated_at: new Date().toISOString(),
          schema_version: 1,
          tables: BACKUP_TABLES,
        },
      };
      let totalRows = 0;

      for (const table of BACKUP_TABLES) {
        const { data, error } = await (supabase.from(table as any) as any).select("*");
        if (error) {
          console.error(`Error backing up ${table}:`, error);
          snapshot[table] = { error: error.message, rows: [] };
          continue;
        }
        snapshot[table] = data || [];
        totalRows += (data || []).length;
      }

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pieceswap_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await logAction({
        action: "export_full_backup",
        entity_type: "backup",
        entity_id: "snapshot",
        new_value: { tables: BACKUP_TABLES.length, total_rows: totalRows },
      });
      toast({ title: "Backup criado", description: `${totalRows} registos em ${BACKUP_TABLES.length} tabelas.` });
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({ title: "Erro", description: "Não foi possível criar o backup.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  if (!canExportData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exportações</h1>
          <p className="text-muted-foreground">Exportar dados em CSV</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não tens permissões para exportar dados.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportações</h1>
        <p className="text-muted-foreground">Exportar dados em CSV</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          As exportações respeitam as normas RGPD. Dados sensíveis como emails não são incluídos.
          Todas as exportações são registadas no audit log.
        </AlertDescription>
      </Alert>

      {/* Backup & Recovery */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Backup & Recuperação</CardTitle>
              <CardDescription>Cópia de segurança completa em JSON</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="flex gap-2 items-start">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Backup automático da plataforma</p>
                <p className="text-muted-foreground">
                  A base de dados tem snapshots diários geridos pela infraestrutura, com point-in-time recovery.
                  O restore é executado a partir das definições de backend.
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <Database className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Snapshot manual (testável)</p>
                <p className="text-muted-foreground">
                  Descarrega um JSON com todas as tabelas críticas ({BACKUP_TABLES.length}). Pode ser usado
                  para verificação, auditoria ou re-importação SQL em caso de necessidade.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={exportFullBackup} disabled={exporting === "full_backup"}>
              {exporting === "full_backup" ? (
                <>A criar snapshot...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Criar Backup Completo (JSON)
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Inclui: {BACKUP_TABLES.join(", ")}
            </span>
          </div>

          <details className="text-sm border rounded-lg p-3 bg-muted/30">
            <summary className="font-medium cursor-pointer">Procedimento de restore</summary>
            <ol className="list-decimal ml-5 mt-2 space-y-1 text-muted-foreground">
              <li>Para incidente grave: pedir restore point-in-time nas definições de backend (snapshot da plataforma).</li>
              <li>Para recuperação parcial: abrir este JSON, localizar a tabela/registos afetados e re-inserir via SQL <code>INSERT … ON CONFLICT</code>.</li>
              <li>Validar integridade após restore com as exportações CSV abaixo (utilizadores, transações).</li>
              <li>Registar a operação no audit log (esta ação já é registada automaticamente).</li>
            </ol>
          </details>
        </CardContent>
      </Card>



      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtro de Data</CardTitle>
          <CardDescription>Seleciona o período de dados a exportar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label>Período</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dados</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Utilizadores</CardTitle>
                <CardDescription>Exportar lista de utilizadores registados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui: ID, username, nome, localização, rating, SwapCoins, data de registo, estado
            </p>
            <Button onClick={exportUsers} disabled={exporting === "users"}>
              {exporting === "users" ? (
                <>A exportar...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Anúncios</CardTitle>
                <CardDescription>Exportar lista de anúncios</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui: ID, título, categoria, condição, preços, estado, datas
            </p>
            <Button onClick={exportListings} disabled={exporting === "listings"}>
              {exporting === "listings" ? (
                <>A exportar...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Transações</CardTitle>
                <CardDescription>Exportar histórico de vendas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui: ID, artigo, vendedor, comprador, valor, comissão, estado
            </p>
            <Button onClick={exportTransactions} disabled={exporting === "transactions"}>
              {exporting === "transactions" ? (
                <>A exportar...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Denúncias</CardTitle>
                <CardDescription>Exportar histórico de reports</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui: ID, tipo, motivo, estado, datas, IDs relacionados
            </p>
            <Button onClick={exportReports} disabled={exporting === "reports"}>
              {exporting === "reports" ? (
                <>A exportar...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminExports;
