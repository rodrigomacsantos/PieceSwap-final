import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Heart, RotateCcw, Star } from "lucide-react";
import { useState } from "react";

interface SwipeCardProps {
  id: string;
  name: string;
  image: string;
  owner: string;
  wantsToTrade: string[];
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
}

const SwipeCard = ({ name, image, owner, wantsToTrade, onSwipe, isTop }: SwipeCardProps) => {
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      const direction = info.offset.x > 0 ? "right" : "left";
      setExitDirection(direction);
      onSwipe(direction);
    }
  };

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 bg-card rounded-3xl card-shadow overflow-hidden scale-95 -translate-y-2"
        style={{ zIndex: 0 }}
      >
        <img src={image} alt={name} className="w-full h-full object-cover opacity-50" />
      </div>
    );
  }

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: 10 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? { x: exitDirection === "right" ? 500 : -500, opacity: 0 } : {}}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-card rounded-3xl card-shadow overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Image */}
      <div className="relative h-[70%]">
        <img src={image} alt={name} className="w-full h-full object-cover" />
        
        {/* Like/Nope Indicators */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-8 px-6 py-2 border-4 border-lego-green rounded-lg rotate-[-20deg]"
        >
          <span className="text-lego-green font-display font-bold text-3xl">MATCH!</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-8 right-8 px-6 py-2 border-4 border-primary rounded-lg rotate-[20deg]"
        >
          <span className="text-primary font-display font-bold text-3xl">NOPE</span>
        </motion.div>
      </div>

      {/* Info */}
      <div className="p-6 h-[30%] flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-display font-bold text-foreground mb-1">{name}</h3>
          <p className="text-muted-foreground text-sm">por {owner}</p>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quer trocar por:</p>
          <div className="flex flex-wrap gap-2">
            {wantsToTrade.slice(0, 3).map((item) => (
              <span key={item} className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface SwipeActionsProps {
  onSwipe: (direction: "left" | "right") => void;
  onUndo: () => void;
  onSuperlike?: () => void;
  canSuperlike?: boolean;
  isPremium?: boolean;
}

export const SwipeActions = ({ onSwipe, onUndo, onSuperlike, canSuperlike, isPremium }: SwipeActionsProps) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSwipe("left")}
        className="w-14 h-14 rounded-full bg-card card-shadow flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <X className="w-7 h-7" />
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onUndo}
        className="w-10 h-10 rounded-full bg-card card-shadow flex items-center justify-center text-lego-orange hover:bg-lego-orange hover:text-accent-foreground transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
      </motion.button>

      {/* Superlike Button (Premium only) */}
      <motion.button
        whileHover={{ scale: isPremium ? 1.1 : 1 }}
        whileTap={{ scale: isPremium ? 0.9 : 1 }}
        onClick={onSuperlike}
        disabled={!isPremium}
        className={`w-12 h-12 rounded-full card-shadow flex items-center justify-center transition-colors ${
          isPremium && canSuperlike
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
        title={!isPremium ? "Exclusivo Premium" : canSuperlike ? "Superlike" : "Sem superlikes disponíveis"}
      >
        <Star className={`w-5 h-5 ${isPremium && canSuperlike ? "fill-current" : ""}`} />
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSwipe("right")}
        className="w-14 h-14 rounded-full bg-card card-shadow flex items-center justify-center text-lego-green hover:bg-lego-green hover:text-accent-foreground transition-colors"
      >
        <Heart className="w-7 h-7" />
      </motion.button>
    </div>
  );
};

export default SwipeCard;