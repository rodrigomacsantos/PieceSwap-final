import { Link } from "react-router-dom";
import { ArrowLeft, Search, ShieldCheck, CreditCard, Package, MessageCircle, UserCog, HelpCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const faqSections = [
  {
    icon: UserCog,
    title: "Conta e Perfil",
    questions: [
      { q: "Como crio uma conta?", a: "Vai à página de autenticação, preenche os dados e aceita os Termos e Condições. Receberás um email de confirmação." },
      { q: "Posso alterar o meu username?", a: "Sim, vai ao teu perfil e edita o campo de username. O username deve ser único." },
      { q: "Como recupero a minha password?", a: 'Na página de login, clica em "Esqueceste a password?" e introduz o teu email. Receberás um link para definir uma nova password.' },
    ],
  },
  {
    icon: Package,
    title: "Compras e Vendas",
    questions: [
      { q: "Como vendo um artigo?", a: 'Vai à página "Vender", preenche os detalhes do artigo (título, descrição, preço, fotos) e publica o anúncio.' },
      { q: "Como compro um artigo?", a: "Navega pelo Marketplace, escolhe o artigo e compra usando SwapCoins. O vendedor será notificado." },
      { q: "Posso cancelar uma compra?", a: "Sim, podes cancelar enquanto a encomenda estiver no estado pendente. Os SwapCoins são reembolsados automaticamente." },
    ],
  },
  {
    icon: CreditCard,
    title: "SwapCoins",
    questions: [
      { q: "O que são SwapCoins?", a: "SwapCoins é a moeda virtual do PieceSwap. Usas para comprar artigos no Marketplace." },
      { q: "Como obtenho SwapCoins?", a: "Recebes 100 SC ao criar conta. Podes ganhar mais vendendo artigos ou comprando pacotes na Carteira." },
      { q: "Posso converter SwapCoins em dinheiro?", a: "Não. SwapCoins são uma moeda virtual sem valor monetário real." },
    ],
  },
  {
    icon: MessageCircle,
    title: "Trocas e Swipe",
    questions: [
      { q: "Como funciona o Swipe?", a: "Vê artigos de outros utilizadores e desliza para a direita se quiseres trocar, ou para a esquerda para passar. Se ambos derem match, podem combinar a troca!" },
      { q: "Posso filtrar as sugestões de troca?", a: "Sim! Utilizadores Premium podem filtrar por categoria, preço e distância." },
      { q: "O que acontece num match?", a: "Ambos são notificados e podem iniciar conversa para combinar os detalhes da troca." },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    questions: [
      { q: "Como denuncio um utilizador?", a: "No perfil ou anúncio do utilizador, clica no botão de denúncia e descreve o motivo." },
      { q: "Os meus dados estão seguros?", a: "Sim, utilizamos encriptação e boas práticas de segurança. Consulta a nossa Política de Privacidade." },
    ],
  },
];

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold mb-3">Centro de Ajuda</h1>
          <p className="text-muted-foreground">Encontra respostas às perguntas mais frequentes sobre o PieceSwap.</p>
        </div>

        <div className="space-y-8">
          {faqSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-display">{section.title}</h2>
              </div>
              <div className="grid gap-3">
                {section.questions.map((item) => (
                  <Card key={item.q} className="border-0 card-shadow">
                    <CardContent className="pt-5 pb-5">
                      <h3 className="font-medium text-sm mb-2">{item.q}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl bg-muted/50 text-center">
          <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-bold mb-2">Não encontras o que procuras?</h3>
          <p className="text-sm text-muted-foreground mb-4">Entra em contacto connosco e teremos todo o gosto em ajudar.</p>
          <Link to="/contact" className="text-primary hover:underline text-sm font-medium">
            Ir para Contacto →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCenter;
