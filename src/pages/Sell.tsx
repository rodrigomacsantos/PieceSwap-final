import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, Camera, Info, Coins, Tag, FileText, Loader2, Repeat, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIAutoFill from "@/components/AIAutoFill";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const categories = [
  "Minifiguras",
  "Peças Básicas",
  "Peças Técnicas",
  "Sets Completos",
  "Sets Incompletos",
  "Peças Raras",
  "Acessórios",
  "Placas Base",
];

const conditions = [
  { value: "new", label: "Novo", description: "Nunca usado, na embalagem original" },
  { value: "like-new", label: "Como Novo", description: "Usado mas em perfeitas condições" },
  { value: "good", label: "Bom", description: "Pequenos sinais de uso" },
  { value: "fair", label: "Razoável", description: "Sinais visíveis de uso" },
];

const Sell = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    swapCoins: "",
    quantity: "1",
    setNumber: "",
    acceptsTrades: true,
    allowsOffers: false,
    listingType: "sale" as "sale" | "trade_only",
  });

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Tipo de ficheiro inválido: ${file.name}. Apenas JPG, PNG e WebP são permitidos.`;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return `Ficheiro muito grande: ${file.name}. Máximo 5MB por imagem.`;
    }
    return null;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of Array.from(files)) {
      const error = validateImage(file);
      if (error) {
        toast({ title: "Erro", description: error, variant: "destructive" });
        continue;
      }
      if (imageFiles.length + newFiles.length >= 5) break;
      
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImageFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || imageFiles.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('listings_images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('listings_images')
        .getPublicUrl(data.path);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Create listing
      const isTradeOnly = formData.listingType === "trade_only";
      const { error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition,
          price_eur: null,
          price_swap_coins: isTradeOnly ? null : (formData.swapCoins ? parseInt(formData.swapCoins) : null),
          quantity: parseInt(formData.quantity) || 1,
          set_number: formData.setNumber || null,
          accepts_trades: isTradeOnly ? true : formData.acceptsTrades,
          allows_offers: isTradeOnly ? false : formData.allowsOffers,
          images: imageUrls,
        });

      if (error) throw error;

      toast({
        title: "Anúncio criado com sucesso!",
        description: isTradeOnly 
          ? "O teu anúncio está disponível para trocas no Swipe." 
          : "O teu anúncio está agora visível no marketplace.",
      });

      // Reset form
      setFormData({ title: "", description: "", category: "", condition: "", swapCoins: "", quantity: "1", setNumber: "", acceptsTrades: true, allowsOffers: false, listingType: "sale" });
      setImageFiles([]);
      setImagePreviews([]);
    } catch (error) {
      toast({
        title: "Erro ao criar anúncio",
        description: "Por favor, tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
                Criar Anúncio
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Vende ou troca as tuas peças LEGO com a comunidade PieceSwap
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* AI Auto-Fill */}
              <AIAutoFill onAutoFill={(data) => {
                setFormData(prev => ({
                  ...prev,
                  ...(data.title && { title: data.title }),
                  ...(data.description && { description: data.description }),
                  ...(data.category && { category: data.category }),
                  ...(data.condition && { condition: data.condition }),
                  ...(data.swapCoins !== undefined && { swapCoins: String(data.swapCoins) }),
                  ...(data.quantity !== undefined && { quantity: String(data.quantity) }),
                  ...(data.setNumber && { setNumber: data.setNumber }),
                  ...(data.acceptsTrades !== undefined && { acceptsTrades: data.acceptsTrades }),
                  ...(data.allowsOffers !== undefined && { allowsOffers: data.allowsOffers }),
                  ...(data.listingType && { listingType: data.listingType }),
                }));
              }} />

              {/* Images Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    Fotografias
                  </CardTitle>
                  <CardDescription>
                    Adiciona até 5 fotografias. A primeira será a imagem principal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {imagePreviews.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted">
                        <img src={img} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {index === 0 && (
                          <Badge className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary bg-muted/50 hover:bg-muted flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">Adicionar</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Details Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Detalhes do Artigo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Anúncio *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Minifigura Star Wars Darth Vader"
                      value={formData.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreve o artigo em detalhe. Inclui informações sobre o estado, peças incluídas, etc."
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      required
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Seleciona uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat.toLowerCase()}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Condição *</Label>
                      <Select value={formData.condition} onValueChange={(v) => handleChange("condition", v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Seleciona a condição" />
                        </SelectTrigger>
                        <SelectContent>
                          {conditions.map((cond) => (
                            <SelectItem key={cond.value} value={cond.value}>
                              <div className="flex flex-col">
                                <span>{cond.label}</span>
                                <span className="text-xs text-muted-foreground">{cond.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="setNumber">Número do Set (opcional)</Label>
                      <Input
                        id="setNumber"
                        placeholder="Ex: 75192"
                        value={formData.setNumber}
                        onChange={(e) => handleChange("setNumber", e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantidade *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => handleChange("quantity", e.target.value)}
                        required
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Listing Type & Pricing Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Tipo de Anúncio
                  </CardTitle>
                  <CardDescription>
                    Escolhe se queres vender ou apenas trocar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Listing Type Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange("listingType", "sale")}
                      className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        formData.listingType === "sale"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <Coins className="w-6 h-6 mx-auto mb-2 text-lego-yellow" />
                      <p className="font-medium text-sm">Venda</p>
                      <p className="text-xs text-muted-foreground mt-1">Marketplace + Swipe</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange("listingType", "trade_only")}
                      className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        formData.listingType === "trade_only"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <Repeat className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">Apenas Troca</p>
                      <p className="text-xs text-muted-foreground mt-1">Só no Swipe to Match</p>
                    </button>
                  </div>

                  {/* Price field - only for sale */}
                  {formData.listingType === "sale" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="swapCoins" className="flex items-center gap-2">
                          Preço *
                          <Coins className="w-4 h-4 text-lego-yellow" />
                        </Label>
                        <div className="relative">
                          <Input
                            id="swapCoins"
                            type="number"
                            min="0"
                            placeholder="100"
                            value={formData.swapCoins}
                            onChange={(e) => handleChange("swapCoins", e.target.value)}
                            required
                            className="h-12 pr-24"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            SwapCoins
                          </span>
                        </div>
                      </div>

                      {/* Toggle Trade */}
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Repeat className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <Label htmlFor="acceptsTrades" className="text-base font-medium">
                              Disponível para trocas
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Permite que o teu anúncio apareça no Swipe to Match para possíveis trocas.
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="acceptsTrades"
                          checked={formData.acceptsTrades}
                          onCheckedChange={(checked) => handleChange("acceptsTrades", checked)}
                        />
                      </div>

                      {/* Toggle Offers */}
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-lego-yellow/10 flex items-center justify-center flex-shrink-0">
                            <HandCoins className="w-5 h-5 text-lego-yellow" />
                          </div>
                          <div>
                            <Label htmlFor="allowsOffers" className="text-base font-medium">
                              Permitir ofertas
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Os compradores podem propor um valor diferente do preço indicado.
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="allowsOffers"
                          checked={formData.allowsOffers}
                          onCheckedChange={(checked) => handleChange("allowsOffers", checked)}
                        />
                      </div>
                    </>
                  )}

                  {formData.listingType === "trade_only" && (
                    <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Anúncio apenas para troca</p>
                        <p>
                          Este anúncio não aparecerá no Marketplace. Será visível apenas no Swipe to Match
                          para que outros utilizadores possam propor trocas.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Info Box */}
                  {formData.listingType === "sale" && (
                    <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Como funcionam os SwapCoins?</p>
                        <p>
                          SwapCoins é a moeda da comunidade PieceSwap. Ganhas SwapCoins ao vender ou trocar peças, 
                          e podes usá-los para comprar de outros membros. 1€ = 100 SwapCoins.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button type="button" variant="outline" className="h-12 px-8" disabled={isSubmitting}>
                  Guardar Rascunho
                </Button>
                <Button type="submit" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A publicar...
                    </>
                  ) : (
                    "Publicar Anúncio"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Sell;
