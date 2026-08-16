import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string; feedback?: 1 | -1; commentOpen?: boolean };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SUGGESTIONS = [
  "Como funciona o PieceSwap?",
  "Como posso vender LEGO?",
  "O que são SwapCoins?",
  "Como funciona o Swipe?",
];

const AIChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        upsert("Tens de iniciar sessão para falar com o SwapBot. 🔒");
        setIsLoading(false);
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages }),
      });


      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        upsert(err.error || "Desculpa, ocorreu um erro. Tenta novamente. 😔");
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        upsert("Desculpa, não consegui processar o pedido.");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch { /* ignore */ }
        }
      }
    } catch {
      upsert("Erro de ligação. Verifica a tua internet e tenta novamente. 🔌");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await streamChat(newMessages);
  }, [messages, isLoading, streamChat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Handle link clicks inside markdown to navigate internally
  const handleLinkClick = (href: string) => {
    if (href.startsWith("/")) {
      navigate(href);
      setOpen(false);
    } else {
      window.open(href, "_blank");
    }
  };

  // Don't show on admin pages
  if (location.pathname.startsWith("/admin") || location.pathname === "/chats") return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Abrir chat de ajuda"
        >
          <Bot className="w-7 h-7" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-t-2xl shrink-0">
            <Bot className="w-6 h-6" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm">SwapBot</p>
              <p className="text-xs opacity-80">Assistente PieceSwap</p>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex gap-2 items-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2 text-sm text-foreground">
                    Olá! 👋 Sou o SwapBot, o teu assistente no PieceSwap. Em que posso ajudar?
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const prevUser = msg.role === "assistant" ? messages.slice(0, i).reverse().find((m) => m.role === "user")?.content ?? "" : "";
              const submitFeedback = async (rating: 1 | -1, comment?: string) => {
                setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, feedback: rating, commentOpen: false } : m)));
                try {
                  await supabase.functions.invoke("ai-feedback", {
                    body: { agent_key: "swapbot", user_message: prevUser, assistant_message: msg.content, rating, comment },
                  });
                } catch (e) { console.error(e); }
              };
              return (
              <div key={i} className={cn("flex gap-2 items-start", msg.role === "user" && "flex-row-reverse")}>
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
                )}>
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className={cn(
                    "rounded-xl px-3 py-2 text-sm",
                    msg.role === "assistant"
                      ? "bg-muted text-foreground rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_a]:text-primary [&_a]:underline [&_a]:font-medium">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => (
                              <a href={href || "#"} onClick={(e) => { e.preventDefault(); if (href) handleLinkClick(href); }} className="text-primary underline font-medium cursor-pointer">{children}</a>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="m-0">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "assistant" && msg.content && !isLoading && (
                    <div className="flex items-center gap-1 px-1">
                      {msg.feedback ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3" /> Obrigado pelo feedback</span>
                      ) : (
                        <>
                          <button onClick={() => submitFeedback(1)} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Útil">
                            <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground hover:text-green-600" />
                          </button>
                          <button onClick={() => setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, commentOpen: !m.commentOpen } : m)))} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Não útil">
                            <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {msg.commentOpen && (
                    <form
                      className="flex gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        submitFeedback(-1, String(fd.get("c") || "").trim() || undefined);
                      }}
                    >
                      <input name="c" placeholder="O que correu mal? (opcional)" className="flex-1 text-xs bg-muted rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30" autoFocus />
                      <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs px-2">Enviar</Button>
                    </form>
                  )}
                </div>
              </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2 items-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 py-3 border-t border-border shrink-0 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreve a tua pergunta..."
              disabled={isLoading}
              className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="rounded-xl h-9 w-9 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
