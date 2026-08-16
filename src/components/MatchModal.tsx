import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Repeat } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedItem: {
    name: string;
    image: string;
    owner: string;
    conversationId?: string;
  } | null;
}

const MatchModal = ({ isOpen, onClose, matchedItem }: MatchModalProps) => {
  const navigate = useNavigate();

  if (!matchedItem) return null;

  const handleChat = () => {
    onClose();
    // Navigate to the specific conversation if we have its ID
    if (matchedItem.conversationId) {
      navigate(`/chats?conversation=${matchedItem.conversationId}`);
    } else {
      navigate("/chats");
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative bg-card rounded-3xl p-8 max-w-sm w-full text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: ["#E53935", "#FFB300", "#2196F3", "#4CAF50", "#FF5722"][i % 5],
                    left: `${Math.random() * 100}%`,
                    top: "-10px",
                  }}
                  initial={{ y: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    y: 400,
                    opacity: 0,
                    rotate: 360,
                    x: (Math.random() - 0.5) * 100,
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>

            {/* Match icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2, damping: 10, stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-lego-green to-lego-blue rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Repeat className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-display font-bold mb-2 text-gradient"
            >
              É um Match! 🎉
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-6"
            >
              Tu e <span className="font-semibold text-foreground">{matchedItem.owner}</span> querem trocar!
            </motion.p>

            {/* Item preview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-muted/50 rounded-xl p-4 mb-6"
            >
              <img
                src={matchedItem.image}
                alt={matchedItem.name}
                className="w-24 h-24 rounded-xl object-cover mx-auto mb-3"
              />
              <p className="font-medium text-sm line-clamp-2">{matchedItem.name}</p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-3"
            >
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Continuar
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleChat}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Conversar
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MatchModal;
