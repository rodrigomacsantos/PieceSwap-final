# PieceSwap

**A plataforma portuguesa de troca e venda de peças LEGO.**

PieceSwap é um marketplace comunitário onde entusiastas de LEGO podem comprar, vender e trocar peças e sets. Com um sistema de economia virtual (SwapCoins), swipe-to-trade, gamificação e chat em tempo real.

---

## Demo

🔗 **[pieceswap.lovable.app](https://pieceswap.lovable.app)**

---

## Funcionalidades

- **Marketplace** — Publicação de anúncios com imagens, categorias, condição e preços (EUR / SwapCoins)
- **Swipe-to-Trade** — Sistema de matching inspirado em apps de dating para encontrar trocas
- **SwapCoins** — Economia virtual com pacotes de compra, recompensas e transações
- **Chat em Tempo Real** — Mensagens diretas entre compradores e vendedores
- **Gamificação** — Sistema de XP, níveis, badges, streaks diários e desafios semanais
- **Planos Premium** — Subscrições com benefícios (mais swipes, superlikes, destaque de anúncios)
- **Boost de Anúncios** — Promover listings para o topo do marketplace com SwapCoins
- **Sistema de Ofertas** — Negociação de preços com contra-propostas
- **Geolocalização** — Descobrir utilizadores e anúncios próximos
- **Sistema de Referral** — Códigos de convite com recompensas
- **Avaliações** — Reviews entre compradores e vendedores após transações
- **Assistente IA** — Chat com IA e auto-preenchimento de anúncios
- **Painel de Administração** — Dashboard completo com:
  - Gestão de utilizadores (suspender, verificar, ajustar SwapCoins)
  - Gestão de anúncios (editar, remover, boost manual)
  - Sistema de reports com ações de moderação
  - Audit log com histórico de todas as ações administrativas
  - Roles (admin, moderator, support)
  - Proteção brute-force no login admin
  - Estatísticas e exportação de dados

---

## Tech Stack

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS 3, shadcn/ui |
| **State & Data** | TanStack Query, React Hook Form, Zod |
| **Animações** | Framer Motion |
| **Backend** | Supabase (Auth, PostgreSQL, Edge Functions, Storage, Realtime) |
| **Routing** | React Router DOM 6 |

---

## Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- npm ou bun

### Passos

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd pieceswap

# 2. Instalar dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

> **Nota:** O ficheiro `.env` já está incluído no repositório com as chaves públicas do projeto. Estas são chaves **anon/publishable** — seguras para uso client-side. A segurança é garantida por Row Level Security (RLS) na base de dados.

---

## Utilização

1. **Registar** — Criar conta com email e password na página `/auth`
2. **Onboarding** — Preencher perfil (nome, localização, avatar)
3. **Marketplace** — Explorar anúncios em `/marketplace`, filtrar por categoria e ordenar
4. **Criar Anúncio** — Publicar uma peça/set em `/sell` com fotos, preço e detalhes
5. **Swipe** — Descobrir trocas em `/swap` deslizando para a esquerda/direita
6. **Chat** — Conversar com outros utilizadores em `/chats`
7. **Perfil** — Ver e editar perfil, histórico de transações e badges em `/profile`

### Acesso Admin

O painel de administração está disponível em `/admin`. Requer um utilizador com role `admin`, `moderator` ou `support` na tabela `user_roles`.

- Admin: professor@admin.com / pieceswap  
- Moderator: professor@mod.com / pieceswap  
- Support: professor@supp.com / pieceswap  

(Contas criadas apenas para avaliação do projeto)

---

## Estrutura do Projeto

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── admin/           # Componentes do painel de administração
│   └── ui/              # Componentes shadcn/ui
├── hooks/               # Custom hooks (auth, listings, messages, etc.)
├── integrations/        # Cliente e tipos Supabase (auto-gerado)
├── lib/                 # Utilitários e helpers
├── pages/               # Páginas da aplicação
│   └── admin/           # Páginas do painel admin
supabase/
├── functions/           # Edge Functions (login, IA, subscrições)
├── config.toml          # Configuração do projeto Supabase
```

---

## Segurança

- **Row Level Security (RLS)** em todas as tabelas
- **Roles de administração** (admin, moderator, support) com função `has_role()` em SECURITY DEFINER
- **Proteção brute-force** — Bloqueio após 5 tentativas falhadas de login admin
- **Audit log** — Registo de todas as ações administrativas
- **Chaves públicas apenas** — Nenhuma chave secreta exposta no client-side

---

## Licença

Projeto académico — desenvolvido para avaliação curricular.

---

## Créditos

- Desenvolvido com [Lovable](https://lovable.dev)
- Backend powered by [Supabase](https://supabase.com)
- UI components por [shadcn/ui](https://ui.shadcn.com)
