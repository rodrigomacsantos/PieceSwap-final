import { motion } from "framer-motion";
import { CheckCircle, Crown, ArrowRight, Sparkles, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Confetti from "@/components/Confetti";

const CheckoutSuccess = () => {
  const features = [
    { icon: Sparkles, text: "Swipes ilimitados ativados" },
    { icon: Star, text: "1 Superlike disponível hoje" },
    { icon: Zap, text: "Os teus anúncios agora têm prioridade" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Confetti />
      
      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-lego-green/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-lego-green" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-full mb-4">
                <Crown className="w-4 h-4 text-secondary-foreground" />
                <span className="text-sm font-medium text-secondary-foreground">Bem-vindo ao Premium!</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Pagamento Concluído!
              </h1>
              <p className="text-muted-foreground mb-8">
                A tua subscrição Premium está agora ativa. Aproveita todas as funcionalidades exclusivas!
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-4">O que foi desbloqueado:</h3>
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <feature.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-foreground">{feature.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/swap">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar a fazer swipe
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Ver Marketplace
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccess;
