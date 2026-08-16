import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import ProductCard from "./ProductCard";
import { Link } from "react-router-dom";

const sampleProducts = [
  {
    id: "1",
    name: "LEGO Technic Bugatti Chiron 42083 - Peças Avulsas",
    price: 250,
    image: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=400&fit=crop",
    seller: "João M.",
    condition: "como novo" as const,
    category: "Technic",
  },
  {
    id: "2",
    name: "Minifiguras Star Wars - Lote de 5 Personagens",
    price: 180,
    image: "https://images.unsplash.com/photo-1518946222227-364f22132616?w=400&h=400&fit=crop",
    seller: "Maria S.",
    condition: "usado" as const,
    category: "Star Wars",
  },
  {
    id: "3",
    name: "LEGO City - Estação de Polícia Completa",
    price: 450,
    image: "https://images.unsplash.com/photo-1560961911-ba7ef651a56c?w=400&h=400&fit=crop",
    seller: "Pedro R.",
    condition: "novo" as const,
    category: "City",
  },
  {
    id: "4",
    name: "Peças Raras LEGO Creator Expert - Modular",
    price: 320,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    seller: "Ana L.",
    condition: "como novo" as const,
    category: "Creator Expert",
  },
];

const MarketplacePreview = () => {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Marketplace
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Descobre milhares de peças e sets LEGO à venda. Desde minifiguras raras a conjuntos completos.
            </p>
          </div>
          <Link to="/marketplace">
            <Button variant="ghost" className="group text-primary hover:text-primary/80">
              Ver tudo
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sampleProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <ProductCard {...product} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarketplacePreview;