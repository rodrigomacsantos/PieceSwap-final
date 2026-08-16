import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { User, Coins, Package, History, Settings, Star, MapPin, Calendar, Edit2, Plus, Camera, Save, X, Loader2, ShoppingBag, Repeat, Heart, Trophy, LogOut, MessageCircle, Bell, BellOff, Flag, HandCoins, Gift, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useListings } from "@/hooks/useListings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrdersSection from "@/components/OrdersSection";
import MatchesSection from "@/components/MatchesSection";
import { useLikes } from "@/hooks/useLikes";
import GamificationPanel from "@/components/GamificationPanel";
import ReviewsGallery from "@/components/ReviewsGallery";
import OffersSection from "@/components/OffersSection";
import ReportModal from "@/components/ReportModal";
import { cn } from "@/lib/utils";
import { useCategoryFollows } from "@/hooks/useCategoryFollows";

import { getConditionLabel, getConditionColor } from "@/lib/conditions";

const legoCategories = [
  "technic", "star wars", "city", "creator expert", "creator 3-in-1", "marvel",
  "harry potter", "ninjago", "architecture", "minifiguras", "friends",
  "speed champions", "ideas", "duplo", "icons", "botanical collection",
  "art", "classic", "disney", "dc", "jurassic world", "minecraft",
  "monkie kid", "super mario", "indiana jones", "lord of the rings",
  "dreamzzz", "space", "pirates", "castle", "bionicle", "modular buildings"
];

const navItems = [
  { key: "listings", label: "Anúncios", icon: Package },
  { key: "reviews", label: "Avaliações", icon: Star },
  { key: "favorites", label: "Favoritos", icon: Heart },
  { key: "matches", label: "Matches", icon: Repeat },
  { key: "orders", label: "Encomendas", icon: ShoppingBag },
  { key: "offers", label: "Ofertas", icon: HandCoins },
  { key: "achievements", label: "Conquistas", icon: Trophy },
  { key: "history", label: "Histórico", icon: History },
  { key: "settings", label: "Definições", icon: Settings },
];

const Profile = () => {
  const { id: profileId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile, fetchProfile } = useProfile();
  const { fetchUserListings } = useListings();
  const { fetchLikedListings, toggleLike } = useLikes();
  const { followedCategories, isFollowing, toggleFollow, loading: followsLoading } = useCategoryFollows();
  const [listings, setListings] = useState<any[]>([]);
  const [likedListings, setLikedListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [likesLoading, setLikesLoading] = useState(false);
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "listings");
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<any>(null);
  const [viewedProfileLoading, setViewedProfileLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    location: "",
  });

  // Determine if viewing own profile or another user's
  const isOwnProfile = !profileId || profileId === user?.id;
  const displayProfile = isOwnProfile ? profile : viewedProfile;

  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Restrict tabs for public profiles
  const publicNavItems = [
    { key: "listings", label: "Anúncios", icon: Package },
    { key: "reviews", label: "Avaliações", icon: Star },
  ];
  const currentNavItems = isOwnProfile ? navItems : publicNavItems;

  useEffect(() => {
    if (!profileId && !user && !profileLoading) {
      navigate("/auth");
    }
  }, [user, profileLoading, navigate, profileId]);

  // Load viewed profile if it's not own
  useEffect(() => {
    const loadViewedProfile = async () => {
      if (profileId && profileId !== user?.id) {
        setViewedProfileLoading(true);
        const { data } = await (supabase as any)
          .from('public_profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();
        setViewedProfile(data as any);
        setViewedProfileLoading(false);
      }
    };
    loadViewedProfile();
  }, [profileId, user?.id]);

  useEffect(() => {
    const loadListings = async () => {
      const targetId = isOwnProfile ? user?.id : profileId;
      if (targetId) {
        setListingsLoading(true);
        const userListings = await fetchUserListings(targetId);
        setListings(userListings);
        setListingsLoading(false);
      }
    };
    loadListings();
  }, [user, profileId, isOwnProfile, fetchUserListings]);

  useEffect(() => {
    const loadLikes = async () => {
      if (user && isOwnProfile && activeTab === 'favorites') {
        setLikesLoading(true);
        const liked = await fetchLikedListings();
        setLikedListings(liked);
        setLikesLoading(false);
      }
    };
    loadLikes();
  }, [user, activeTab, isOwnProfile]);

  useEffect(() => {
    if (profile && isOwnProfile) {
      setEditForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
      });
    }
  }, [profile, isOwnProfile]);

  // Reset tab when switching between own/public profile
  useEffect(() => {
    if (!isOwnProfile && !publicNavItems.find(n => n.key === activeTab)) {
      setActiveTab("listings");
    }
  }, [isOwnProfile, activeTab]);

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    await updateProfile(editForm);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('listings_images')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('listings_images')
        .getPublicUrl(filePath);
      await updateProfile({ avatar_url: publicUrl });
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const activeListings = listings.filter(l => l.status === "active");
  const userListings = listings;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' });
  };

  if (profileLoading || viewedProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwnProfile && !displayProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
          <div className="container mx-auto px-4 text-center py-20">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Utilizador não encontrado</h1>
            <p className="text-muted-foreground mb-6">Este perfil não existe ou foi removido.</p>
            <Link to="/marketplace"><Button>Voltar ao Marketplace</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isOwnProfile && !user) return null;

  const displayName = displayProfile?.full_name || displayProfile?.username || (isOwnProfile ? user?.email?.split('@')[0] : "Utilizador");
  const displayUsername = displayProfile?.username ? `@${displayProfile.username}` : (isOwnProfile ? user?.email : "");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar */}
            <aside className="lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-28 space-y-4">
                {/* Profile Card */}
                <Card>
                  <CardContent className="p-5">
                     <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3">
                        <Avatar className="w-20 h-20 border-3 border-primary">
                          <AvatarImage src={displayProfile?.avatar_url || ''} alt={displayName} />
                          <AvatarFallback className="text-xl font-display bg-primary text-primary-foreground">
                            {displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOwnProfile && (
                          <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                            {uploading ? <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" /> : <Camera className="w-3.5 h-3.5 text-primary-foreground" />}
                          </label>
                        )}
                      </div>
                      <h2 className="font-display font-bold text-lg text-foreground">{displayName}</h2>
                      <p className="text-sm text-muted-foreground">{displayUsername}</p>

                      {displayProfile?.bio && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{displayProfile.bio}</p>
                      )}

                      {displayProfile?.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <MapPin className="w-3 h-3" />
                          {displayProfile.location}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Membro desde {displayProfile?.created_at ? formatDate(displayProfile.created_at) : 'hoje'}
                      </p>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 mt-4 w-full">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold text-foreground">{activeListings.length}</p>
                          <p className="text-[10px] text-muted-foreground">Anúncios</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold text-foreground">{displayProfile?.rating || '-'}</p>
                          <p className="text-[10px] text-muted-foreground">Rating</p>
                        </div>
                        {isOwnProfile && (
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-lg font-bold text-foreground">{displayProfile?.swap_coins || 0}</p>
                            <p className="text-[10px] text-muted-foreground">SC</p>
                            {(displayProfile as any)?.pending_swap_coins > 0 && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400">+{(displayProfile as any).pending_swap_coins} pendente</p>
                            )}
                          </div>
                        )}
                        {!isOwnProfile && (
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-lg font-bold text-foreground">{displayProfile?.total_ratings || 0}</p>
                            <p className="text-[10px] text-muted-foreground">Avaliações</p>
                          </div>
                        )}
                      </div>

                      {isOwnProfile ? (
                        <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => { setActiveTab('settings'); setIsEditing(true); }}>
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                          Editar Perfil
                        </Button>
                      ) : user && profileId !== user.id ? (
                        <div className="w-full mt-3 space-y-2">
                          <Button size="sm" className="w-full" onClick={() => navigate(`/chats?seller=${profileId}`)}>
                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                            Contactar
                          </Button>
                          <Button size="sm" variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => setReportModalOpen(true)}>
                            <Flag className="w-3.5 h-3.5 mr-1.5" />
                            Reportar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <Card>
                  <CardContent className="p-2">
                    <nav className="space-y-0.5">
                      {currentNavItems.map(item => (
                        <button
                          key={item.key}
                          onClick={() => setActiveTab(item.key)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                            activeTab === item.key
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </nav>
                  </CardContent>
                </Card>

                {/* Sign Out - only own profile */}
                {isOwnProfile && (
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Terminar Sessão
                  </Button>
                )}
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Listings */}
              {activeTab === "listings" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-display font-bold">{isOwnProfile ? "Meus Anúncios" : `Anúncios de ${displayName}`}</h2>
                    {isOwnProfile && (
                      <Link to="/sell">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Anúncio
                        </Button>
                      </Link>
                    )}
                  </div>

                  {listingsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : userListings.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ainda não tens anúncios</h3>
                        <p className="text-muted-foreground mb-4">Começa a vender ou trocar as tuas peças LEGO!</p>
                        <Link to="/sell"><Button><Plus className="w-4 h-4 mr-2" />Criar Primeiro Anúncio</Button></Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {userListings.map((listing) => (
                        <div key={listing.id} className="relative group">
                          <Link to={`/product/${listing.id}`}>
                            <motion.div whileHover={{ y: -4 }} className="bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all h-full">
                              <div className="relative aspect-square">
                                <img src={listing.images?.[0] || '/placeholder.svg'} alt={listing.title} className="w-full h-full object-cover" />
                                <Badge className={`absolute top-3 left-3 ${getConditionColor(listing.condition)}`}>{getConditionLabel(listing.condition)}</Badge>
                                {listing.status === "sold" && (
                                  <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                                    <Badge variant="secondary" className="text-lg px-4 py-2">Vendido</Badge>
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <h3 className="font-medium mb-2 line-clamp-1">{listing.title}</h3>
                                {listing.price_swap_coins && (
                                  <p className="text-xl font-display font-bold text-primary flex items-center gap-1">
                                    <Coins className="w-5 h-5 text-lego-yellow" />{listing.price_swap_coins} SC
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          </Link>
                          {isOwnProfile && (
                            <Button variant="secondary" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/edit-listing/${listing.id}`); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Reviews */}
              {activeTab === "reviews" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">{isOwnProfile ? "As Minhas Avaliações" : `Avaliações de ${displayName}`}</h2>
                  <ReviewsGallery
                    userId={isOwnProfile ? user!.id : profileId!}
                    rating={displayProfile?.rating}
                    totalRatings={displayProfile?.total_ratings}
                  />
                </motion.div>
              )}

              {/* Favorites */}
              {activeTab === "favorites" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">Os Meus Favoritos</h2>
                  {likesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : likedListings.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Sem favoritos ainda</h3>
                        <p className="text-muted-foreground mb-4">Guarda os anúncios que te interessam clicando no ❤️</p>
                        <Link to="/marketplace"><Button>Explorar Marketplace</Button></Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {likedListings.map((listing: any) => (
                        <div key={listing.id} className="relative group">
                          <Link to={`/product/${listing.id}`}>
                            <motion.div whileHover={{ y: -4 }} className="bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all h-full">
                              <div className="relative aspect-square">
                                <img src={listing.images?.[0] || '/placeholder.svg'} alt={listing.title} className="w-full h-full object-cover" />
                                <Badge className={`absolute top-3 left-3 ${getConditionColor(listing.condition)}`}>{getConditionLabel(listing.condition)}</Badge>
                              </div>
                              <div className="p-4">
                                <h3 className="font-medium mb-2 line-clamp-1">{listing.title}</h3>
                                {listing.price_swap_coins && (
                                  <p className="text-xl font-display font-bold text-primary flex items-center gap-1">
                                    <Coins className="w-5 h-5 text-lego-yellow" />{listing.price_swap_coins} SC
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          </Link>
                          <Button variant="secondary" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-destructive" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await toggleLike(listing.id); setLikedListings(prev => prev.filter(l => l.id !== listing.id)); }}>
                            <Heart className="w-4 h-4 fill-current" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Matches */}
              {activeTab === "matches" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">Os Meus Matches</h2>
                  <MatchesSection />
                </motion.div>
              )}

              {/* Orders */}
              {activeTab === "orders" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">As Minhas Encomendas</h2>
                  <OrdersSection />
                </motion.div>
              )}

              {/* Offers */}
              {activeTab === "offers" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">Ofertas de Preço</h2>
                  <OffersSection />
                </motion.div>
              )}

              {/* Achievements */}
              {activeTab === "achievements" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">Conquistas & Progresso</h2>
                  <GamificationPanel />
                </motion.div>
              )}

              {/* History */}
              {activeTab === "history" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">Histórico de Transações</h2>
                  <OrdersSection />
                </motion.div>
              )}

              {/* Settings */}
              {activeTab === "settings" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-display font-bold mb-6">Definições da Conta</h2>

                  {isEditing ? (
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4 max-w-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="full_name">Nome Completo</Label>
                              <Input id="full_name" value={editForm.full_name} onChange={(e) => handleEditChange("full_name", e.target.value)} placeholder="O teu nome" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="username">Username</Label>
                              <Input id="username" value={editForm.username} onChange={(e) => handleEditChange("username", e.target.value)} placeholder="o_teu_username" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location">Localização</Label>
                            <Input id="location" value={editForm.location} onChange={(e) => handleEditChange("location", e.target.value)} placeholder="Lisboa, Portugal" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bio">Biografia</Label>
                            <Textarea id="bio" value={editForm.bio} onChange={(e) => handleEditChange("bio", e.target.value)} placeholder="Conta-nos um pouco sobre ti..." rows={3} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveProfile}><Save className="w-4 h-4 mr-1.5" />Guardar</Button>
                            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-1.5" />Cancelar</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3 max-w-2xl">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Informações Pessoais</p>
                                <p className="text-sm text-muted-foreground">Nome, email, biografia</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Localização</p>
                                <p className="text-sm text-muted-foreground">{profile?.location || 'Não definida'}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Referral Code */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Gift className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Código de Referral</p>
                              <p className="text-sm text-muted-foreground">Partilha com amigos e ambos recebem 25 SwapCoins!</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 font-mono text-lg font-bold tracking-widest text-center">
                              {(profile as any)?.referral_code || '...'}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const code = (profile as any)?.referral_code;
                                if (code) {
                                  navigator.clipboard.writeText(code);
                                  toast.success("Código copiado!");
                                }
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const code = (profile as any)?.referral_code;
                                if (code && navigator.share) {
                                  navigator.share({
                                    title: 'PieceSwap - Código de Referral',
                                    text: `Usa o meu código ${code} ao registares-te no PieceSwap e ambos recebemos 25 SwapCoins! 🧱`,
                                    url: window.location.origin + '/auth',
                                  });
                                } else if (code) {
                                  navigator.clipboard.writeText(`Usa o meu código ${code} ao registares-te no PieceSwap e ambos recebemos 25 SwapCoins! ${window.location.origin}/auth`);
                                  toast.success("Link copiado!");
                                }
                              }}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Category Follows */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <Bell className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Categorias Seguidas</p>
                              <p className="text-sm text-muted-foreground">Recebe alertas quando houver novos anúncios nestas categorias</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {legoCategories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => toggleFollow(cat)}
                                disabled={followsLoading}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize flex items-center gap-1.5",
                                  isFollowing(cat)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                              >
                                {isFollowing(cat) ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                                {cat}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Report Modal for public profiles */}
      {!isOwnProfile && profileId && (
        <ReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          reportType="user"
          reportedUserId={profileId}
          reportedItemName={displayName}
        />
      )}
    </div>
  );
};

export default Profile;
