import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Repeat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface MatchItem {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherFullName: string;
  otherAvatarUrl: string | null;
  myListingTitle: string;
  myListingImage: string;
  theirListingTitle: string;
  theirListingImage: string;
  createdAt: string;
  conversationId: string | null;
}

const MatchesSection = () => {
  const { user } = useAuth();
  const { createConversation } = useMessages();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch matches where user is either user1 or user2
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Enrich each match with profile and listing data
      const enriched = await Promise.all(
        data.map(async (match) => {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          const myListingId = match.user1_id === user.id ? match.listing1_id : match.listing2_id;
          const theirListingId = match.user1_id === user.id ? match.listing2_id : match.listing1_id;

          const [profileRes, myListingRes, theirListingRes, convRes] = await Promise.all([
            (supabase as any).from('public_profiles').select('username, full_name, avatar_url').eq('id', otherUserId).maybeSingle(),
            supabase.from('listings').select('title, images').eq('id', myListingId).maybeSingle(),
            supabase.from('listings').select('title, images').eq('id', theirListingId).maybeSingle(),
            supabase.from('conversations').select('id').eq('match_id', match.id).maybeSingle(),
          ]);

          return {
            id: match.id,
            otherUserId,
            otherUsername: profileRes.data?.username || '',
            otherFullName: profileRes.data?.full_name || profileRes.data?.username || 'Utilizador',
            otherAvatarUrl: profileRes.data?.avatar_url || null,
            myListingTitle: myListingRes.data?.title || 'Anúncio',
            myListingImage: myListingRes.data?.images?.[0] || '/placeholder.svg',
            theirListingTitle: theirListingRes.data?.title || 'Anúncio',
            theirListingImage: theirListingRes.data?.images?.[0] || '/placeholder.svg',
            createdAt: match.created_at,
            conversationId: convRes.data?.id || null,
          } as MatchItem;
        })
      );

      setMatches(enriched);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (match: MatchItem) => {
    if (match.conversationId) {
      navigate(`/chats?conversation=${match.conversationId}`);
    } else {
      // Create a conversation for this match
      const conversation = await createConversation(match.otherUserId, undefined, match.id);
      if (conversation) {
        navigate(`/chats?conversation=${conversation.id}`);
      } else {
        navigate('/chats');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Repeat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Ainda não tens matches</h3>
          <p className="text-muted-foreground mb-4">
            Vai ao Swap e desliza para a direita nos anúncios que te interessam. Quando o outro utilizador também gostar dos teus, é match!
          </p>
          <Button onClick={() => navigate('/swap')} className="bg-primary text-primary-foreground">
            Ir para o Swap
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match, index) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Other user avatar */}
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarImage src={match.otherAvatarUrl || ''} alt={match.otherFullName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {match.otherFullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Match info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{match.otherFullName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(match.createdAt)}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <span className="truncate max-w-[100px]">{match.myListingTitle}</span>
                    <Repeat className="w-3 h-3 flex-shrink-0 text-primary" />
                    <span className="truncate max-w-[100px]">{match.theirListingTitle}</span>
                  </div>
                </div>

                {/* Listing thumbnails */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <img src={match.myListingImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <Repeat className="w-3 h-3 text-primary" />
                  <img src={match.theirListingImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                </div>

                {/* Message button */}
                <Button
                  size="sm"
                  onClick={() => handleMessage(match)}
                  className="flex-shrink-0"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Mensagem
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default MatchesSection;
