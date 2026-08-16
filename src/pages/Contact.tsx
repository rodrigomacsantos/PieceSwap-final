import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Clock, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    const subject = searchParams.get("subject");
    const orderId = searchParams.get("order_id");
    const listing = searchParams.get("listing");

    if (subject) {
      setFormData((p) => ({ ...p, subject }));
    }
    if (orderId) {
      const msg = `Problema com encomenda #${orderId.slice(0, 8)}${listing ? ` — "${listing}"` : ""}\n\nDescreve o teu problema:`;
      setFormData((p) => ({ ...p, message: msg }));
    }
  }, [searchParams]);

  // Auto-fill name/email for logged-in users
  useEffect(() => {
    if (user) {
      setFormData((p) => ({
        ...p,
        name: profile?.full_name || profile?.username || p.name,
        email: user.email || p.email,
      }));
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Mensagem enviada!", description: "Responderemos o mais breve possível." });
    setFormData({ name: user ? formData.name : "", email: user ? formData.email : "", subject: "", message: "" });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>

        <h1 className="text-3xl font-display font-bold mb-3">Contacto</h1>
        <p className="text-muted-foreground mb-10">Tens alguma questão, sugestão ou problema? Entra em contacto connosco.</p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {[
            { icon: Mail, label: "Email", value: "suporte@pieceswap.com" },
            { icon: Clock, label: "Tempo de Resposta", value: "Até 48 horas úteis" },
            { icon: MapPin, label: "Localização", value: "Portugal" },
          ].map((item) => (
            <Card key={item.label} className="border-0 card-shadow">
              <CardContent className="pt-5 pb-5 text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-sm mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 card-shadow">
          <CardContent className="pt-6">
            <h2 className="text-xl font-display font-bold mb-6">Envia-nos uma Mensagem</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!user && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" placeholder="O teu nome" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Select value={formData.subject} onValueChange={(v) => setFormData((p) => ({ ...p, subject: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona um assunto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Questão Geral</SelectItem>
                    <SelectItem value="bug">Reportar Problema</SelectItem>
                    <SelectItem value="account">Problema com Conta</SelectItem>
                    <SelectItem value="order">Problema com Encomenda</SelectItem>
                    <SelectItem value="suggestion">Sugestão</SelectItem>
                    <SelectItem value="partnership">Parceria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea id="message" placeholder="Descreve a tua questão..." rows={5} value={formData.message} onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))} required />
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                <Send className="w-4 h-4 mr-2" />
                {loading ? "A enviar..." : "Enviar Mensagem"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
