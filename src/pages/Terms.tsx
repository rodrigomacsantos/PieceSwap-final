import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<br key={key++} />);
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-xl font-display mt-6 mb-2">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      // Skip — we render our own h1
    } else {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed mb-2">
          {trimmed}
        </p>
      );
    }
  }
  return elements;
};

const Terms = () => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "terms_and_conditions")
        .single();

      if (data?.value && typeof data.value === "string" && data.value.trim()) {
        setContent(data.value);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>

        <h1 className="text-3xl font-display font-bold mb-8">Termos e Condições</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <div className="text-foreground/90">{renderMarkdown(content)}</div>
        ) : (
          <FallbackTerms />
        )}
      </main>
      <Footer />
    </div>
  );
};

const FallbackTerms = () => (
  <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
    <section className="space-y-3">
      <h2 className="text-xl font-display">1. Aceitação dos Termos</h2>
      <p className="text-sm leading-relaxed">
        Ao criar uma conta e utilizar o PieceSwap, aceitas estes Termos e Condições na sua totalidade.
      </p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-display">2. Descrição do Serviço</h2>
      <p className="text-sm leading-relaxed">
        O PieceSwap é uma plataforma online que permite aos utilizadores comprar, vender e trocar peças e sets LEGO®.
      </p>
    </section>
  </div>
);

export default Terms;
