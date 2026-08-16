import { Link } from "react-router-dom";
import { ArrowLeft, Cookie } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const cookieTypes = [
  {
    name: "Cookies Essenciais",
    description: "Necessários para o funcionamento básico da plataforma. Incluem cookies de autenticação e sessão. Não podem ser desativados.",
    examples: ["Sessão de login", "Preferências de idioma", "Token de segurança"],
    required: true,
  },
  {
    name: "Cookies de Funcionalidade",
    description: "Permitem funcionalidades adicionais como preferências de filtros, localização guardada e tema visual.",
    examples: ["Filtros de pesquisa guardados", "Localização aproximada", "Modo escuro/claro"],
    required: false,
  },
  {
    name: "Cookies de Desempenho",
    description: "Ajudam-nos a entender como os utilizadores interagem com a plataforma, permitindo melhorar a experiência.",
    examples: ["Páginas visitadas", "Tempo na plataforma", "Erros encontrados"],
    required: false,
  },
];

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>

        <div className="flex items-center gap-3 mb-3">
          <Cookie className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Política de Cookies</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: 28 de fevereiro de 2026</p>

        <div className="space-y-6 text-foreground/90 mb-10">
          <section className="space-y-3">
            <h2 className="text-xl font-display">O que são Cookies?</h2>
            <p className="text-sm leading-relaxed">
              Cookies são pequenos ficheiros de texto armazenados no teu dispositivo quando visitas um website. Servem para memorizar as tuas preferências e melhorar a tua experiência de utilização.
            </p>
          </section>
        </div>

        <div className="space-y-4 mb-10">
          {cookieTypes.map((cookie) => (
            <Card key={cookie.name} className="border-0 card-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{cookie.name}</h3>
                  {cookie.required && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Obrigatório</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{cookie.description}</p>
                <div className="flex flex-wrap gap-2">
                  {cookie.examples.map((ex) => (
                    <span key={ex} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{ex}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-display">Como Gerir Cookies</h2>
            <p className="text-sm leading-relaxed">
              Podes controlar e eliminar cookies através das definições do teu navegador. Nota que desativar cookies essenciais pode afetar o funcionamento da plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display">Mais Informações</h2>
            <p className="text-sm leading-relaxed">
              Para mais detalhes sobre como tratamos os teus dados, consulta a nossa{" "}
              <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cookies;
