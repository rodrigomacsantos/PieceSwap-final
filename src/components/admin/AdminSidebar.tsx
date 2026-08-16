import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Flag,
  Heart,
  Coins,
  ShoppingCart,
  Crown,
  Settings,
  Download,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Euro,
  Trophy,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AdminSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, isModerator, canManageSwapCoins, canManageConfig, canExportData } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      path: "/admin", 
      show: true 
    },
    { 
      icon: Users, 
      label: "Utilizadores", 
      path: "/admin/users", 
      show: isModerator 
    },
    { 
      icon: Package, 
      label: "Anúncios", 
      path: "/admin/listings", 
      show: isModerator 
    },
    { 
      icon: Flag, 
      label: "Reports", 
      path: "/admin/reports", 
      show: true 
    },
    { 
      icon: Heart, 
      label: "Swipe & Matching", 
      path: "/admin/swipe", 
      show: isAdmin 
    },
    { 
      icon: Coins, 
      label: "SwapCoins", 
      path: "/admin/swapcoins", 
      show: canManageSwapCoins 
    },
    { 
      icon: ShoppingCart, 
      label: "Marketplace", 
      path: "/admin/marketplace", 
      show: isModerator 
    },
    { 
      icon: Crown, 
      label: "Subscrições", 
      path: "/admin/subscriptions", 
      show: isAdmin 
    },
    { 
      icon: Settings, 
      label: "Configurações", 
      path: "/admin/config", 
      show: canManageConfig 
    },
    { 
      icon: Euro, 
      label: "Receitas", 
      path: "/admin/revenue", 
      show: isAdmin 
    },
    { 
      icon: Trophy, 
      label: "Gamificação", 
      path: "/admin/gamification", 
      show: isAdmin 
    },
    { 
      icon: Bot, 
      label: "Agentes IA", 
      path: "/admin/ai-agents", 
      show: isAdmin 
    },
    { 
      icon: Download, 
      label: "Exportações", 
      path: "/admin/exports", 
      show: canExportData 
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside 
      className={cn(
        "bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="font-display font-bold text-lg text-primary">PieceSwap</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/admin" && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
