import { motion } from "framer-motion";
import { Camera, Tags, ShoppingBag, Repeat, MessageSquare, Package } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "Fotografa",
    description: "Tira fotos das tuas peças ou sets LEGO que queres vender ou trocar",
    color: "bg-lego-red",
  },
  {
    icon: Tags,
    title: "Lista",
    description: "Adiciona detalhes, preço ou indica o que aceitas em troca",
    color: "bg-lego-yellow",
  },
  {
    icon: ShoppingBag,
    title: "Vende",
    description: "Recebe ofertas de compradores interessados nas tuas peças",
    color: "bg-lego-blue",
  },
  {
    icon: Repeat,
    title: "Troca",
    description: "Usa o swipe para encontrar matches e trocar peças",
    color: "bg-lego-green",
  },
  {
    icon: MessageSquare,
    title: "Conversa",
    description: "Chat integrado para combinar detalhes com compradores ou parceiros de troca",
    color: "bg-lego-orange",
  },
  {
    icon: Package,
    title: "Envia",
    description: "Envia de forma segura ou combina entrega em mão",
    color: "bg-primary",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Em poucos passos, começa a vender ou trocar as tuas peças LEGO
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-card rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-shadow h-full">
                <div className={`w-14 h-14 ${step.color} rounded-xl flex items-center justify-center mb-4`}>
                  <step.icon className="w-7 h-7 text-accent-foreground" />
                </div>
                <div className="absolute top-4 right-6 text-6xl font-display font-bold text-muted/50">
                  {index + 1}
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;