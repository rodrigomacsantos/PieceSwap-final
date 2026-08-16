import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Repeat, ShoppingBag, Sparkles, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao PieceSwap!",
    description: "A comunidade onde podes trocar e vender peças LEGO com outros fãs. Vamos mostrar-te como funciona!",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Coins,
    title: "SwapCoins",
    description: "SwapCoins é a moeda da comunidade. Começas com 100 SC grátis! Ganha mais ao vender peças ou completar desafios. 1€ = 100 SC.",
    color: "text-lego-yellow",
    bg: "bg-lego-yellow/10",
  },
  {
    icon: Repeat,
    title: "Swipe to Match",
    description: "Faz swipe nos anúncios que te interessam. Se o outro utilizador também gostar das tuas peças, é match! Podem combinar trocas diretamente.",
    color: "text-lego-blue",
    bg: "bg-lego-blue/10",
  },
  {
    icon: ShoppingBag,
    title: "Marketplace",
    description: "Compra e vende peças LEGO com SwapCoins. Publica anúncios em segundos e encontra peças raras de outros colecionadores!",
    color: "text-lego-green",
    bg: "bg-lego-green/10",
  },
];

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OnboardingModal = ({ open, onOpenChange }: OnboardingModalProps) => {
  const [step, setStep] = useState(0);
  const { user } = useAuth();

  const markCompleted = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      markCompleted();
    }
  };

  const handleSkip = () => {
    markCompleted();
  };

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className={`w-16 h-16 rounded-2xl ${current.bg} flex items-center justify-center mx-auto mb-6`}>
                <current.icon className={`w-8 h-8 ${current.color}`} />
              </div>
              <h2 className="text-xl font-display font-bold mb-3">{current.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{current.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            <Button className="flex-1" onClick={handleNext}>
              {step === steps.length - 1 ? "Começar!" : (
                <>Seguinte <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>

          {step === 0 && (
            <button onClick={handleSkip} className="w-full text-center text-sm text-muted-foreground mt-3 hover:text-foreground transition-colors">
              Saltar tutorial
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
