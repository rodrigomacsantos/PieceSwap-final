import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SwipeCard, { SwipeActions } from "./SwipeCard";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const sampleSwipeItems = [
  {
    id: "1",
    name: "LEGO Architecture Taj Mahal",
    image: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=400&h=600&fit=crop",
    owner: "Carlos P.",
    wantsToTrade: ["Star Wars", "Technic", "Creator Expert"],
  },
  {
    id: "2",
    name: "Minifiguras Marvel - Coleção Completa",
    image: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=600&fit=crop",
    owner: "Sofia M.",
    wantsToTrade: ["DC Comics", "Harry Potter", "Ninjago"],
  },
  {
    id: "3",
    name: "LEGO Ideas NASA Apollo Saturn V",
    image: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=400&h=600&fit=crop",
    owner: "Miguel A.",
    wantsToTrade: ["Space", "City", "Technic"],
  },
];

const SwipePreview = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedItems, setSwipedItems] = useState<string[]>([]);

  const handleSwipe = (direction: "left" | "right") => {
    const currentItem = sampleSwipeItems[currentIndex];
    if (currentItem) {
      setSwipedItems([...swipedItems, currentItem.id]);
      setCurrentIndex((prev) => Math.min(prev + 1, sampleSwipeItems.length));
    }
  };

  const handleUndo = () => {
    if (swipedItems.length > 0) {
      setSwipedItems(swipedItems.slice(0, -1));
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const visibleCards = sampleSwipeItems.slice(currentIndex, currentIndex + 2);

  return (
    <section className="py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">Novo!</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
              Swipe para{" "}
              <span className="text-gradient">encontrar trocas</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Inspirado no Tinder, o nosso sistema de trocas torna fácil encontrar 
              pessoas que querem trocar o que tens pelo que procuras. Desliza para 
              a direita se estiveres interessado!
            </p>

            <div className="space-y-4 mb-8">
              {[
                { title: "Swipe Right", desc: "Mostra interesse na troca" },
                { title: "Match!", desc: "Quando ambos querem trocar, é match!" },
                { title: "Chat", desc: "Combina os detalhes da troca" },
              ].map((step, index) => (
                <div key={step.title} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/swap">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 group">
                Começar a Trocar
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          {/* Swipe Demo */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-full max-w-[320px] h-[480px]">
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
              
              {currentIndex >= sampleSwipeItems.length && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-3xl">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Não há mais cards!</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentIndex(0);
                        setSwipedItems([]);
                      }}
                    >
                      Recomeçar Demo
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {currentIndex < sampleSwipeItems.length && (
              <SwipeActions onSwipe={handleSwipe} onUndo={handleUndo} />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SwipePreview;