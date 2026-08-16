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

const Privacy = () => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "privacy_policy")
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

        <h1 className="text-3xl font-display font-bold mb-3">Política de Privacidade</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <div className="text-foreground/90">{renderMarkdown(content)}</div>
        ) : (
          <FallbackPrivacy />
        )}
      </main>
      <Footer />
    </div>
  );
};

const FallbackPrivacy = () => (
  <div className="space-y-6 text-foreground/90">
    <section className="space-y-3">
      <h2 className="text-xl font-display">1. Dados Recolhidos</h2>
      <p className="text-sm leading-relaxed">
        Recolhemos os seguintes dados quando utilizas o PieceSwap: nome, email, username, localização aproximada, fotos e dados de utilização.
      </p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-display">2. Utilização dos Dados</h2>
      <p className="text-sm leading-relaxed">
        Os teus dados são utilizados para gerir a tua conta, facilitar transações e melhorar a plataforma.
      </p>
    </section>
  </div>
);

export default Privacy;
