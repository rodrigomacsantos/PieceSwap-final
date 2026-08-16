import { motion } from "framer-motion";
import { Coins, Sparkles, ShieldCheck, Zap, TrendingUp, Info, Loader2, Check, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Wallet = () => {
  const { user, swapcoins, pendingSwapcoins, refreshBalance } = useAuth();
  const { products, loading } = useProducts();
  const { toast } = useToast();

  const handlePurchase = async (product: Product) => {
    if (!user) {
      toast({ title: "Erro", description: "Tens de estar autenticado para comprar.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.rpc('process_wallet_purchase', {
        p_user_id: user.id,
        p_amount: product.swapcoins_amount
      });

      if (error) throw error;

      await refreshBalance();
      toast({ title: "Compra efetuada!", description: `Adicionaste ${product.swapcoins_amount} SwapCoins à tua carteira.` });
    } catch (error) {
      console.error("Error purchasing SwapCoins:", error);
      toast({ title: "Erro", description: "Não foi possível completar a compra.", variant: "destructive" });
    }
  };

  const getPackageStyles = (index: number) => {
    const styles = [
      { border: "border-lego-blue/50", iconBg: "bg-lego-blue/10", iconColor: "text-lego-blue", button: "bg-lego-blue hover:bg-lego-blue/90" },
      { border: "border-lego-green/50", iconBg: "bg-lego-green/10", iconColor: "text-lego-green", button: "bg-lego-green hover:bg-lego-green/90" },
      { border: "border-lego-red/50", iconBg: "bg-lego-red/10", iconColor: "text-lego-red", button: "bg-lego-red hover:bg-lego-red/90" },
      { border: "border-lego-yellow/50", iconBg: "bg-lego-yellow/10", iconColor: "text-lego-yellow", button: "bg-lego-yellow hover:bg-lego-yellow/90 text-black" },
    ];
    return styles[index % styles.length];
  };

  const benefits = [
    {
      icon: Zap,
      title: "Transações Instantâneas",
      description: "Usa SwapCoins para trocas imediatas sem esperar por transferências bancárias."
    },
    {
      icon: ShieldCheck,
      title: "Segurança Garantida",
      description: "A tua carteira está protegida e todas as transações são auditadas."
    },
    {
      icon: TrendingUp,
      title: "Valorização",
      description: "Aproveita promoções exclusivas e bónus ao carregar a tua carteira."
    },
    {
      icon: Sparkles,
      title: "Acesso Prioritário",
      description: "Certos itens raros podem ser adquiridos preferencialmente com SwapCoins."
    }
  ];

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
              <Coins className="w-5 h-5 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">A Tua Carteira PieceSwap</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Gere as tuas <span className="text-gradient">SwapCoins</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Carrega o teu saldo e começa a trocar peças LEGO de forma rápida, segura e divertida.
            </p>
          </motion.div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-16"
          >
            <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card to-muted/30">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Coins className="w-32 h-32 text-primary" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Saldo Disponível</h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-display font-bold text-primary">{swapcoins || 0}</span>
                      <span className="text-xl font-medium text-foreground">SwapCoins</span>
                    </div>
                    {pendingSwapcoins > 0 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        +{pendingSwapcoins} SC pendentes (vendas em curso)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                      <Info className="w-4 h-4" />
                      Como funciona?
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Products Grid */}
          <div className="mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-display font-bold mb-2">Comprar SwapCoins</h2>
              <p className="text-muted-foreground">Escolhe o pacote que melhor se adapta às tuas necessidades</p>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((pkg, index) => {
                  const styles = getPackageStyles(index);
                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * (index + 3) }}
                      whileHover={{ y: -8 }}
                    >
                      <Card className={`h-full flex flex-col overflow-hidden border-2 transition-all ${styles.border} hover:shadow-xl`}>
                        <CardHeader className="text-center pb-2">
                          <div className={`w-16 h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                            <Coins className={`w-8 h-8 ${styles.iconColor}`} />
                          </div>
                          <Badge variant="secondary" className="w-fit mx-auto mb-2">
                            +{pkg.swapcoins_amount} SC
                            {pkg.bonus_coins > 0 && (
                              <span className="ml-1 text-lego-green">(+{pkg.bonus_coins} bónus)</span>
                            )}
                          </Badge>
                          <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col text-center">
                          <div className="mb-6">
                            <div className="text-3xl font-display font-bold text-foreground">
                              €{pkg.price_eur.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            className={`w-full mt-auto font-bold transition-colors ${styles.button}`}
                            onClick={() => handlePurchase(pkg)}
                          >
                            Comprar Agora
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-muted/30 rounded-3xl p-8 md:p-12"
          >
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-display font-bold mb-4">Porquê usar SwapCoins?</h2>
                <p className="text-muted-foreground">A moeda oficial da nossa comunidade LEGO</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-card rounded-xl flex items-center justify-center shadow-sm border border-border">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-lego-green/10 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-lego-green" />
                  </div>
                  <p className="text-sm font-medium">Trocas diretas continuam 100% gratuitas!</p>
                </div>
                <Button variant="link" className="text-primary gap-2 p-0 h-auto font-bold">
                  Sabe mais sobre a economia PieceSwap
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wallet;
