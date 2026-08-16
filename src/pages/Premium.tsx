import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Star, Zap, ArrowUp, Sparkles, Users, Building, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionPlans, getPlanFeatures } from "@/hooks/useSubscriptionPlans";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, freeSwipeLimit, planName } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { config } = useSiteConfig();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = (plan: { name: string; price: number }) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const price = billingCycle === 'monthly' ? plan.price : plan.price * 10;
    navigate('/checkout', { state: { billingCycle, price, planName: plan.name } });
  };

  // Build comparison features dynamically from plans
  const buildComparisonFeatures = () => {
    const features = [
      { name: "Swipes diários", free: String(freeSwipeLimit), values: plans.map(p => p.daily_swipe_limit === 0 ? "Ilimitados" : String(p.daily_swipe_limit)) },
      { name: "Superlikes", free: "0", values: plans.map(p => `${p.daily_superlike_limit} por dia`) },
      { name: "Destaque de anúncios", free: "Não", values: plans.map(p => p.can_highlight ? "Sim" : "Não") },
      { name: "Prioridade no Swap", free: "Não", values: plans.map(p => p.priority_boost > 0 ? `${p.priority_boost}x` : "Não") },
      { name: "Trocas gratuitas", free: "Sim", values: plans.map(() => "Sim") },
      { name: "Mensagens ilimitadas", free: "Sim", values: plans.map(() => "Sim") },
    ];
    return features;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-full mb-4">
              <Crown className="w-5 h-5 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">PieceSwap Premium</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Leva as tuas trocas ao{" "}
              <span className="text-gradient">próximo nível</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Desbloqueia funcionalidades exclusivas e aumenta as tuas chances de encontrar as peças LEGO perfeitas.
            </p>
          </motion.div>

          {/* Pricing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Anual
                <Badge variant="secondary" className="text-xs">-17%</Badge>
              </button>
            </div>
          </motion.div>

          {/* Loading State */}
          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Plan Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`grid gap-6 mb-16 mx-auto ${
                  plans.length === 1 ? 'max-w-md' : plans.length === 2 ? 'max-w-2xl md:grid-cols-2' : 'max-w-4xl md:grid-cols-3'
                }`}
              >
                {plans.map((plan, planIndex) => {
                  const monthlyPrice = plan.price;
                  const yearlyPrice = monthlyPrice * 10;
                  const currentPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
                  const features = getPlanFeatures(plan);
                  const isCurrentPlan = isPremium && planName?.toLowerCase() === plan.name.toLowerCase();

                  return (
                    <Card key={planIndex} className="relative overflow-hidden border-2 border-secondary/50">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                      <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Crown className="w-8 h-8 text-secondary-foreground" />
                        </div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>Todas as funcionalidades desbloqueadas</CardDescription>
                      </CardHeader>
                      <CardContent className="text-center">
                        <div className="mb-6">
                          <span className="text-5xl font-display font-bold text-foreground">
                            €{currentPrice.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">
                            /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                          </span>
                        </div>

                        <ul className="space-y-3 mb-8 text-left">
                          {features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-lego-green/20 flex items-center justify-center mt-0.5">
                                <Check className="w-3 h-3 text-lego-green" />
                              </div>
                              <span className="text-sm text-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {isCurrentPlan ? (
                          <Button disabled className="w-full" size="lg">
                            Plano atual
                          </Button>
                        ) : isPremium ? (
                          <Button onClick={() => handleSubscribe(plan)} variant="outline" className="w-full" size="lg">
                            Mudar para {plan.name}
                          </Button>
                        ) : (
                          <Button onClick={() => handleSubscribe(plan)} className="w-full" size="lg">
                            Começar agora
                          </Button>
                        )}

                        <p className="text-xs text-muted-foreground mt-4">
                          Cancela a qualquer momento. Sem compromissos.
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}

                {plans.length === 0 && (
                  <Card className="relative overflow-hidden border-2 border-secondary/50 max-w-md mx-auto">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                    <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-8 h-8 text-secondary-foreground" />
                      </div>
                      <CardTitle className="text-2xl">Premium</CardTitle>
                      <CardDescription>Todas as funcionalidades desbloqueadas</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-6">
                        <span className="text-5xl font-display font-bold text-foreground">€14.99</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-left">
                        {["1 Superlike por dia", "Destaque no Marketplace", "Prioridade no Swap", "Swipes ilimitados"].map((f, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-lego-green/20 flex items-center justify-center mt-0.5">
                              <Check className="w-3 h-3 text-lego-green" />
                            </div>
                            <span className="text-sm text-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      {isPremium ? (
                        <Button disabled className="w-full" size="lg">Já és Premium</Button>
                      ) : (
                        <Button onClick={() => handleSubscribe({ name: 'Premium', price: 14.99 })} className="w-full" size="lg">
                          Começar agora
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </>
          )}

          {/* Comparison Table */}
          {plans.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-4xl mx-auto mb-16"
            >
              <h2 className="text-2xl font-display font-bold text-center mb-8">
                Compara os planos
              </h2>
              <Card>
                <CardContent className="p-0">
                  <div className={`grid gap-4 p-4 bg-muted/50 rounded-t-lg`} style={{ gridTemplateColumns: `1fr repeat(${plans.length + 1}, 1fr)` }}>
                    <div className="font-semibold">Funcionalidade</div>
                    <div className="text-center font-semibold">Gratuito</div>
                    {plans.map((plan) => (
                      <div key={plan.name} className="text-center font-semibold text-primary">{plan.name}</div>
                    ))}
                  </div>
                  {buildComparisonFeatures().map((feature, index) => (
                    <div
                      key={index}
                      className={`grid gap-4 p-4 ${index !== buildComparisonFeatures().length - 1 ? 'border-b' : ''}`}
                      style={{ gridTemplateColumns: `1fr repeat(${plans.length + 1}, 1fr)` }}
                    >
                      <div className="text-sm text-foreground">{feature.name}</div>
                      <div className="text-center text-sm text-muted-foreground">{feature.free}</div>
                      {feature.values.map((val, i) => (
                        <div key={i} className="text-center text-sm font-medium text-primary">{val}</div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Commissions Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-muted/30 rounded-2xl p-8 mb-16"
          >
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">
                Modelo de Comissões
              </h2>
              <p className="text-muted-foreground mb-6">
                O PieceSwap cobra uma comissão de <strong>{config.marketplace_commission}%</strong> apenas nas vendas diretas no marketplace.
                As trocas entre utilizadores são sempre <strong>100% gratuitas</strong>!
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-display font-bold text-lego-green mb-2">0%</div>
                    <div className="font-semibold text-foreground">Trocas</div>
                    <p className="text-sm text-muted-foreground">Totalmente gratuitas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-display font-bold text-primary mb-2">{config.marketplace_commission}%</div>
                    <div className="font-semibold text-foreground">Vendas</div>
                    <p className="text-sm text-muted-foreground">Comissão sobre o valor</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>

          {/* Partnerships CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">
              Parcerias Educativas e Comerciais
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Escolas, lojas e marcas podem integrar-se na plataforma de forma colaborativa.
              Contacta-nos para saber mais sobre oportunidades de parceria.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/partnerships">
                <Button variant="outline" size="lg">
                  <Building className="w-4 h-4 mr-2" />
                  Parcerias Comerciais
                </Button>
              </Link>
              <Link to="/partnerships">
                <Button variant="outline" size="lg">
                  <Users className="w-4 h-4 mr-2" />
                  Parcerias Educativas
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Premium;
