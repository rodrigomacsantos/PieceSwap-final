import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, AlertTriangle, UserCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const securityItems = [
  {
    icon: Lock,
    title: "Dados Encriptados",
    description: "Todas as comunicações e dados sensíveis são protegidos com encriptação de ponta. As tuas passwords são armazenadas de forma segura e nunca em texto simples.",
  },
  {
    icon: Shield,
    title: "Autenticação Segura",
    description: "Utilizamos um sistema de autenticação robusto com proteção contra tentativas de login maliciosas, incluindo bloqueio temporário após múltiplas falhas.",
  },
  {
    icon: Eye,
    title: "Privacidade dos Dados",
    description: "Os teus dados pessoais nunca são vendidos ou partilhados com terceiros para fins de marketing. Apenas recolhemos os dados necessários para o funcionamento da plataforma.",
  },
  {
    icon: AlertTriangle,
    title: "Sistema de Denúncias",
    description: "Podes denunciar utilizadores ou anúncios suspeitos. A nossa equipa de moderação analisa todas as denúncias e toma medidas quando necessário.",
  },
  {
    icon: UserCheck,
    title: "Verificação de Utilizadores",
    description: "Incentivamos perfis completos com localização verificada. Utilizadores Premium passam por verificações adicionais para maior confiança na comunidade.",
  },
];

const tips = [
  "Nunca partilhes a tua password com ninguém.",
  "Verifica sempre o perfil e avaliações do vendedor antes de comprar.",
  "Não efetues pagamentos fora da plataforma.",
  "Se algo parecer suspeito, denuncia imediatamente.",
  "Utiliza uma password forte e única para a tua conta.",
];

const Security = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>

        <h1 className="text-3xl font-display font-bold mb-3">Segurança</h1>
        <p className="text-muted-foreground mb-10">A segurança dos nossos utilizadores é a nossa prioridade. Fica a saber como protegemos a tua conta e os teus dados.</p>

        <div className="space-y-4 mb-12">
          {securityItems.map((item) => (
            <Card key={item.title} className="border-0 card-shadow">
              <CardContent className="pt-5 pb-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="p-6 rounded-xl bg-muted/50">
          <h2 className="text-xl font-display font-bold mb-4">Dicas de Segurança</h2>
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">{i + 1}</span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Security;
