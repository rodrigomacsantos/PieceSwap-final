import { Trophy, Flame, Star, Lock, Zap, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGamification, getLevelName, getXPProgress, getXPForLevel } from "@/hooks/useGamification";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const iconMap: Record<string, React.ReactNode> = {
  'package': <Trophy className="w-5 h-5" />,
  'shopping-bag': <Star className="w-5 h-5" />,
  'coins': <Zap className="w-5 h-5" />,
  'heart': <Star className="w-5 h-5" />,
  'trophy': <Trophy className="w-5 h-5" />,
  'award': <Trophy className="w-5 h-5" />,
  'shopping-cart': <Star className="w-5 h-5" />,
  'gift': <Star className="w-5 h-5" />,
  'trending-up': <Zap className="w-5 h-5" />,
  'star': <Star className="w-5 h-5" />,
  'search': <Target className="w-5 h-5" />,
  'zap': <Zap className="w-5 h-5" />,
  'flame': <Flame className="w-5 h-5" />,
  'crown': <Trophy className="w-5 h-5" />,
  'user-check': <Star className="w-5 h-5" />,
  'message-circle': <Star className="w-5 h-5" />,
};

const GamificationPanel = () => {
  const { badges, userBadges, xp, streak, challenges, loading, earnedBadgeIds } = useGamification();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const progress = getXPProgress(xp.total_xp, xp.level);
  const xpNeeded = getXPForLevel(xp.level) - xp.total_xp;

  // Group badges by category
  const categories = badges.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, typeof badges>);

  const categoryLabels: Record<string, string> = {
    onboarding: 'Primeiros Passos',
    listings: 'Anúncios',
    purchases: 'Compras',
    sales: 'Vendas',
    swaps: 'Trocas',
    swipes: 'Exploração',
    streaks: 'Dedicação',
    social: 'Social',
    general: 'Geral',
  };

  return (
    <div className="space-y-6">
      {/* Level & XP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{xp.level}</p>
            <p className="text-sm font-medium text-primary">{getLevelName(xp.level)}</p>
            <div className="mt-3">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{xpNeeded} XP para o próximo nível</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{streak.current_streak}</p>
            <p className="text-sm text-muted-foreground">Dias seguidos</p>
            <p className="text-xs text-muted-foreground mt-1">Recorde: {streak.longest_streak} dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{userBadges.length}</p>
            <p className="text-sm text-muted-foreground">de {badges.length} badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Challenges */}
      {challenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Desafios Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {challenges.map(challenge => (
              <div key={challenge.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{challenge.title}</p>
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  </div>
                  {challenge.completed ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Concluído</Badge>
                  ) : (
                    <Badge variant="outline">
                      {challenge.xp_reward} XP + {challenge.swapcoins_reward} SC
                    </Badge>
                  )}
                </div>
                <Progress value={(challenge.progress || 0) / challenge.target_value * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{challenge.progress || 0} / {challenge.target_value}</span>
                  <span>Até {format(new Date(challenge.ends_at), "d 'de' MMMM", { locale: pt })}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Badges by Category */}
      {Object.entries(categories).map(([category, categoryBadges]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{categoryLabels[category] || category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categoryBadges.map(badge => {
                const earned = earnedBadgeIds.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl text-center transition-all ${
                      earned 
                        ? 'bg-primary/5 border border-primary/20' 
                        : 'bg-muted/30 opacity-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      earned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {earned ? (iconMap[badge.icon] || <Trophy className="w-5 h-5" />) : <Lock className="w-5 h-5" />}
                    </div>
                    <p className="text-sm font-medium text-foreground">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    {earned ? (
                      <Badge variant="outline" className="mt-2 text-xs">
                        +{badge.xp_reward} XP | +{badge.swapcoins_reward} SC
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">Meta: {badge.requirement_value}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GamificationPanel;
