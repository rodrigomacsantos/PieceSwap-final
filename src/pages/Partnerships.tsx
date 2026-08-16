import { useState } from "react";
import { motion } from "framer-motion";
import { Building, GraduationCap, Store, Send, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Partnerships = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'school' as 'school' | 'store' | 'brand',
    contactEmail: '',
    description: '',
  });

  const partnerTypes = [
    {
      value: 'school',
      icon: GraduationCap,
      title: 'Escola / Instituição Educativa',
      description: 'Programas educativos com LEGO para escolas e universidades',
    },
    {
      value: 'store',
      icon: Store,
      title: 'Loja / Revendedor',
      description: 'Parcerias comerciais para lojas físicas e online',
    },
    {
      value: 'brand',
      icon: Building,
      title: 'Marca / Empresa',
      description: 'Colaborações corporativas e de marketing',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from('partnerships').insert({
      name: formData.name,
      type: formData.type,
      contact_email: formData.contactEmail,
      description: formData.description,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao enviar pedido. Tenta novamente.');
      return;
    }

    setIsSubmitted(true);
    toast.success('Pedido de parceria enviado com sucesso!');
  };

  const benefits = [
    {
      icon: GraduationCap,
      title: 'Parcerias Educativas',
      items: [
        'Descontos especiais para instituições',
        'Programas STEM com LEGO',
        'Kits educativos personalizados',
        'Workshops e formações',
      ],
    },
    {
      icon: Store,
      title: 'Parcerias Comerciais',
      items: [
        'Programa de afiliados',
        'Comissões preferenciais',
        'Visibilidade na plataforma',
        'Suporte dedicado',
      ],
    },
    {
      icon: Building,
      title: 'Parcerias de Marca',
      items: [
        'Campanhas colaborativas',
        'Eventos conjuntos',
        'Co-branding',
        'Acesso a dados de mercado',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full mb-4">
              <Building className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-accent">Parcerias</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Junta-te ao PieceSwap
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolas, lojas e marcas podem integrar-se na nossa plataforma de forma colaborativa.
              Descobre as oportunidades de parceria disponíveis.
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-3 gap-6 mb-16"
          >
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {benefit.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-lego-green" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Application Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Candidatura a Parceria</CardTitle>
                <CardDescription>
                  Preenche o formulário abaixo e entraremos em contacto em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-lego-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-lego-green" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Pedido Enviado!</h3>
                    <p className="text-muted-foreground">
                      Obrigado pelo teu interesse. A nossa equipa irá analisar o pedido e contactar-te em breve.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Organização</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Escola Secundária de Lisboa"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Tipo de Parceria</Label>
                      <RadioGroup
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as typeof formData.type })}
                      >
                        {partnerTypes.map((type) => (
                          <div
                            key={type.value}
                            className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                              formData.type === type.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setFormData({ ...formData, type: type.value as typeof formData.type })}
                          >
                            <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                            <div className="flex-1">
                              <label htmlFor={type.value} className="font-medium text-foreground cursor-pointer">
                                {type.title}
                              </label>
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email de Contacto</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contacto@exemplo.pt"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreve a tua organização e o tipo de parceria que procuras..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                          A enviar...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Candidatura
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Partnerships;
