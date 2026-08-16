import { Bell, Repeat, ShoppingBag, Check, Info, Coins } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  match: <Repeat className="w-4 h-4 text-lego-green" />,
  order: <ShoppingBag className="w-4 h-4 text-primary" />,
  offer: <Coins className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-muted-foreground" />,
};

const NotificationItem = ({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) => {
  const timeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <button
      onClick={() => {
        if (!notification.read) onRead(notification.id);
        onNavigate(notification);
      }}
      className={cn(
        "w-full text-left p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {typeIcons[notification.type] || typeIcons.info}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", !notification.read && "text-foreground", notification.read && "text-muted-foreground")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
      )}
    </button>
  );
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNavigate = (n: Notification) => {
    const data = n.data as Record<string, string> | null;
    if (n.type === "match" && data?.match_id) {
      navigate("/profile?tab=matches");
    } else if (n.type === "order") {
      navigate("/profile?tab=orders");
    } else if (n.type === "offer" && data) {
      // For offer notifications, navigate to chats with the other party
      const otherUserId = data.other_user_id || data.seller_id || data.buyer_id;
      if (data.listing_id && otherUserId) {
        navigate(`/chats?seller=${otherUserId}&listing=${data.listing_id}`);
      } else if (data.listing_id) {
        navigate(`/chats`);
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-transparent">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-medium text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem notificações</p>
            </div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
