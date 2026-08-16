import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Crown, Lock, Star, PackageX, ArrowLeft, ArrowRight, X, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SwipeCard, { SwipeActions } from "@/components/SwipeCard";
import SwipeFilters from "@/components/SwipeFilters";
import MatchModal from "@/components/MatchModal";
import { NearbyUsers } from "@/components/NearbyUsers";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";

import { useSwap } from "@/hooks/useSwap";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Swipe limit is now dynamic from useSubscription

// Categories for "wants to trade" - based on related categories
const relatedCategories: Record<string, string[]> = {
  "Technic": ["Speed Champions", "Creator Expert", "Architecture"],
  "Star Wars": ["Marvel", "DC Comics", "Ideas"],
  "City": ["Creator", "Friends", "Ninjago"],
  "Creator Expert": ["Architecture", "Technic", "Ideas"],
  "Marvel": ["DC Comics", "Star Wars", "Ninjago"],
  "Harry Potter": ["Ideas", "Creator Expert", "Architecture"],
  "Ninjago": ["City", "Marvel", "Star Wars"],
  "Architecture": ["Creator Expert", "Ideas", "Technic"],
  "Minifiguras": ["Star Wars", "Marvel", "Harry Potter"],
};

const Swap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { swipeableListings, loading: listingsLoading, recordSwipe, fetchSwipeableListings, filters, updateFilters } = useSwap();
  const { createConversation } = useMessages();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCount, setSwipedCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedItem, setMatchedItem] = useState<any>(null);
  
  const { 
    isPremium, 
    swipesRemaining, 
    freeSwipeLimit,
    canSwipe, 
    canSuperlike,
    superlikesRemaining,
    recordSwipe: recordSwipeCount, 
    useSuperlike,
  } = useSubscription();

  // Force match from superlike - creates match even without mutual swipe
  const forceMatchFromSuperlike = async (listingId: string, otherUserId: string) => {
    if (!user) return null;
    try {
      // Get one of our own listings to use as listing1
      const { data: ourListing } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('accepts_trades', true)
        .limit(1)
        .maybeSingle();

      const ourListingId = ourListing?.id || listingId;

      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          user1_id: user.id,
          user2_id: otherUserId,
          listing1_id: ourListingId,
          listing2_id: listingId,
        })
        .select()
        .single();

      if (error) {
        console.error('Superlike match creation error:', error);
        toast.error('Não foi possível criar o match', {
          description: 'Tenta novamente em alguns segundos.',
        });
        return null;
      }

      const conversation = await createConversation(otherUserId, listingId, match.id);
      return { match, conversationId: conversation?.id || null };
    } catch (err) {
      console.error('Error forcing match from superlike:', err);
      return null;
    }
  };

  const swipeItems = swipeableListings.map(listing => ({
    id: listing.id,
    name: listing.title,
    image: listing.images?.[0] || "/placeholder.svg",
    owner: listing.seller?.full_name || listing.seller?.username || "Vendedor",
    ownerId: listing.user_id,
    wantsToTrade: relatedCategories[listing.category] || ["Technic", "Star Wars", "City"],
  }));

  // Subscribe to realtime match notifications (for when the OTHER user completes the match)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('match-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user.id}`,
        },
        async (payload) => {
          // This fires when someone else creates a match where we are user1
          const newMatch = payload.new as {
            id: string;
            user1_id: string;
            user2_id: string;
            listing1_id: string;
            listing2_id: string;
          };

          // Fetch the matched listing details (the other user's listing that we liked)
          const { data: listingData } = await supabase
            .from('listings')
            .select('*')
            .eq('id', newMatch.listing2_id)
            .single();

          // Fetch the other user's profile
          const { data: profile } = await (supabase as any)
            .from('public_profiles')
            .select('username, full_name, avatar_url')
            .eq('id', newMatch.user2_id)
            .maybeSingle();

          // Check if there's already a conversation for this match
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('match_id', newMatch.id)
            .maybeSingle();

          setMatchCount(prev => prev + 1);
          setMatchedItem({
            id: newMatch.listing2_id,
            name: listingData?.title || 'Item',
            image: listingData?.images?.[0] || '/placeholder.svg',
            owner: profile?.full_name || profile?.username || 'Utilizador',
            conversationId: existingConv?.id || null,
          });
          setShowMatchModal(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (!canSwipe) {
      toast.error("Atingiste o limite diário de swipes!", {
        description: "Faz upgrade para Premium para swipes ilimitados.",
        action: {
          label: "Ver Premium",
          onClick: () => navigate('/premium'),
        },
      });
      return;
    }

    const currentItem = swipeItems[currentIndex];
    if (!currentItem) return;

    // Record swipe count for subscription limits
    await recordSwipeCount();
    setSwipedCount(prev => prev + 1);

    // Record the actual swipe action
    const action = direction === "right" ? "like" : "dislike";
    const matchResult = await recordSwipe(currentItem.id, action);

    // Check if we got a real match
    if (matchResult && matchResult.match) {
      setMatchCount(prev => prev + 1);
      setMatchedItem({
        id: currentItem.id,
        name: currentItem.name,
        image: currentItem.image,
        owner: matchResult.listing?.seller?.full_name || matchResult.listing?.seller?.username || currentItem.owner,
        conversationId: matchResult.conversationId,
      });
      setShowMatchModal(true);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleSuperlike = async () => {
    if (!isPremium) {
      toast.error("Superlikes são exclusivos do Premium!", {
        action: {
          label: "Ver Premium",
          onClick: () => navigate('/premium'),
        },
      });
      return;
    }

    if (!canSuperlike) {
      toast.error("Já usaste o teu superlike de hoje!", {
        description: "Volta amanhã para mais um superlike.",
      });
      return;
    }

    const currentItem = swipeItems[currentIndex];
    if (!currentItem) return;

    const success = await useSuperlike(currentItem.id);
    if (success) {
      // Superlike = automatic match, record the swipe
      await recordSwipeCount();
      const matchResult = await recordSwipe(currentItem.id, "like");

      // Force create match if not already matched
      if (matchResult && matchResult.match) {
        setMatchCount(prev => prev + 1);
        setMatchedItem({
          id: currentItem.id,
          name: currentItem.name,
          image: currentItem.image,
          owner: matchResult.listing?.seller?.full_name || matchResult.listing?.seller?.username || currentItem.owner,
          conversationId: matchResult.conversationId,
        });
        setShowMatchModal(true);
      } else {
        // Force match via superlike even without mutual swipe
        const forceResult = await forceMatchFromSuperlike(currentItem.id, currentItem.ownerId);
        if (forceResult) {
          setMatchCount(prev => prev + 1);
          setMatchedItem({
            id: currentItem.id,
            name: currentItem.name,
            image: currentItem.image,
            owner: currentItem.owner,
            conversationId: forceResult.conversationId,
          });
          setShowMatchModal(true);
        }
        toast.success("Superlike! Match automático! ⭐", {
          description: "O Superlike garante match imediato!",
        });
      }

      setSwipedCount(prev => prev + 1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleUndo = () => {
    // Undo not supported with real system - each swipe is final
    toast.info("Não é possível desfazer swipes", {
      description: "Cada swipe é final para garantir matches genuínos.",
    });
  };

  const visibleCards = swipeItems.slice(currentIndex, currentIndex + 2);
  const swipeProgress = isPremium ? 100 : Math.min(((freeSwipeLimit - swipesRemaining) / freeSwipeLimit) * 100, 100);
  const noMoreListings = currentIndex >= swipeItems.length && !listingsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">Swipe para trocar</span>
              {isPremium && (
                <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Encontra trocas perfeitas
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Desliza para a direita nas peças que te interessam. Se o outro utilizador também gostar das tuas, é match!
            </p>
          </motion.div>

          {/* Swipe Limit Progress (Free users only) */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="max-w-md mx-auto mb-6"
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Swipes restantes hoje</span>
                <span className="font-medium text-foreground">{Math.max(0, swipesRemaining)}/{freeSwipeLimit}</span>
              </div>
              <Progress value={100 - swipeProgress} className="h-2" />
              {swipesRemaining <= 5 && swipesRemaining > 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Quase a acabar! <Link to="/premium" className="text-primary underline">Faz upgrade</Link> para swipes ilimitados.
                </p>
              )}
              {swipesRemaining <= 0 && (
                <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Limite diário atingido!
                  </p>
                  <Link to="/premium">
                    <Button size="sm" className="mt-2 w-full">
                      <Crown className="w-4 h-4 mr-2" />
                      Desbloquear swipes ilimitados
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-8 mb-8"
          >
            <div className="text-center">
              <div className="text-2xl font-display font-bold text-foreground">{swipedCount}</div>
              <div className="text-sm text-muted-foreground">Vistos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-display font-bold text-lego-green">{matchCount}</div>
              <div className="text-sm text-muted-foreground">Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-display font-bold text-foreground">{Math.max(0, swipeItems.length - currentIndex)}</div>
              <div className="text-sm text-muted-foreground">Restantes</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-display font-bold flex items-center justify-center gap-1 ${superlikesRemaining > 0 ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                <Star className="w-5 h-5" />
                {Math.max(0, superlikesRemaining)}
              </div>
              <div className="text-sm text-muted-foreground">Superlikes</div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-4 mb-8"
          >
            <SwipeFilters
              isPremium={isPremium}
              filters={filters}
              onFiltersChange={updateFilters}
            />
          </motion.div>

          {/* Loading State */}
          {listingsLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">A carregar anúncios...</p>
            </div>
          )}

          {/* No Listings State (never had any) */}
          {!listingsLoading && swipeItems.length === 0 && swipedCount === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                Ainda não há anúncios
              </h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Sê o primeiro a criar um anúncio e começa a trocar LEGO com outros colecionadores!
              </p>
              <Link to="/sell">
                <Button className="bg-primary text-primary-foreground">
                  Criar Anúncio
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Swipe Area */}
          {!listingsLoading && (swipeItems.length > 0 || noMoreListings) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-4 md:gap-8 lg:gap-16 w-full max-w-5xl justify-center">
                {/* Left Indicator - Passar */}
                {currentIndex < swipeItems.length && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{
                      opacity: 0.6,
                      x: [0, -10, 0],
                    }}
                    transition={{
                      x: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                      opacity: { duration: 0.5 }
                    }}
                    className="hidden sm:flex flex-col items-center gap-3 text-primary pointer-events-none select-none"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center">
                      <ArrowLeft className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center">
                      <X className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Passar</span>
                    </div>
                  </motion.div>
                )}

                <div className="relative w-full max-w-[360px] h-[520px] shrink-0">
                  <AnimatePresence>
                    {visibleCards.map((item, index) => (
                      <SwipeCard
                        key={item.id}
                        {...item}
                        onSwipe={handleSwipe}
                        isTop={index === 0}
                      />
                    ))}
                  </AnimatePresence>

                  {/* No more listings - all swiped */}
                  {noMoreListings && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-card rounded-3xl card-shadow"
                    >
                      <div className="text-center p-8">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                          <PackageX className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-2">
                          Não há mais anúncios
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          {matchCount > 0
                            ? `Fizeste ${matchCount} match${matchCount > 1 ? 'es' : ''}! Volta mais tarde para ver novos anúncios.`
                            : "De momento não há mais peças disponíveis para trocar. Volta mais tarde!"}
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                          {matchCount > 0 && (
                            <Link to="/chats">
                              <Button variant="outline">
                                Ver Conversas
                              </Button>
                            </Link>
                          )}
                          <Link to="/sell">
                            <Button className="bg-primary text-primary-foreground">
                              Criar Anúncio
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Right Indicator - Interesse */}
                {currentIndex < swipeItems.length && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: 0.6,
                      x: [0, 10, 0],
                    }}
                    transition={{
                      x: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                      opacity: { duration: 0.5 }
                    }}
                    className="hidden sm:flex flex-col items-center gap-3 text-lego-green pointer-events-none select-none"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-lego-green flex items-center justify-center">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center">
                      <Heart className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Interesse</span>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {currentIndex < swipeItems.length && (
                <SwipeActions 
                  onSwipe={handleSwipe} 
                  onUndo={handleUndo}
                  onSuperlike={handleSuperlike}
                  canSuperlike={canSuperlike}
                  isPremium={isPremium}
                />
              )}

              {/* Instructions */}
              {currentIndex < swipeItems.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-center"
                >
                  <p className="text-sm text-muted-foreground sm:hidden">
                    Arrasta o card para a <span className="text-lego-green font-medium">direita</span> para mostrar interesse
                    ou para a <span className="text-primary font-medium">esquerda</span> para passar
                  </p>
                    {isPremium && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <Star className="w-3 h-3 inline-block mr-1 text-secondary-foreground" />
                      Usa o Superlike para garantir um match automático!
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        <MatchModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          matchedItem={matchedItem}
        />

        {/* Nearby Users Section */}
        <div className="container mx-auto px-4 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <NearbyUsers />
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Swap;
