import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, X, Camera, Info, Coins, Tag, FileText, Loader2, Repeat, ChevronLeft, HandCoins } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useListings } from "@/hooks/useListings";

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

interface ImageItem {
  url: string;
  file?: File;
}

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { fetchListing } = useListings();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);

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
  });

  useEffect(() => {
    const loadListing = async () => {
      if (!id || !user) return;

      const data = await fetchListing(id);
      if (!data) {
        toast({ title: "Erro", description: "Anúncio não encontrado", variant: "destructive" });
        navigate("/profile");
        return;
      }

      if (data.user_id !== user.id) {
        toast({ title: "Erro", description: "Não tens permissão para editar este anúncio", variant: "destructive" });
        navigate("/profile");
        return;
      }

      setFormData({
        title: data.title,
        description: data.description || "",
        category: data.category,
        condition: data.condition,
        swapCoins: data.price_swap_coins?.toString() || "",
        quantity: data.quantity.toString(),
        setNumber: data.set_number || "",
        acceptsTrades: data.accepts_trades,
        allowsOffers: (data as any).allows_offers || false,
      });

      if (data.images && data.images.length > 0) {
        setImages(data.images.map(url => ({ url })));
      }

      setLoading(false);
    };

    loadListing();
  }, [id, user, fetchListing, navigate, toast]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, [images]);

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

    const newImages: ImageItem[] = [];

    for (const file of Array.from(files)) {
      const error = validateImage(file);
      if (error) {
        toast({ title: "Erro", description: error, variant: "destructive" });
        continue;
      }
      if (images.length + newImages.length >= 5) break;

      newImages.push({
        url: URL.createObjectURL(file),
        file: file
      });
    }

    setImages((prev) => [...prev, ...newImages].slice(0, 5));
  };

  const removeImage = (index: number) => {
    const img = images[index];
    if (img.url.startsWith('blob:')) {
      URL.revokeObjectURL(img.url);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadSingleImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('listings_images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('listings_images')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setIsSubmitting(true);
    try {
      // Process all images
      const finalImageUrls = await Promise.all(
        images.map(async (img) => {
          if (img.file) {
            return await uploadSingleImage(img.file);
          }
          return img.url;
        })
      );

      // Update listing
      const { error } = await supabase
        .from('listings')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition,
          price_swap_coins: formData.swapCoins ? parseInt(formData.swapCoins) : null,
          quantity: parseInt(formData.quantity) || 1,
          set_number: formData.setNumber || null,
          accepts_trades: formData.acceptsTrades,
          allows_offers: formData.allowsOffers,
          images: finalImageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Anúncio atualizado!",
        description: "As alterações foram guardadas com sucesso.",
      });

      navigate("/profile");
    } catch (error) {
      console.error("Error updating listing:", error);
      toast({
        title: "Erro ao atualizar anúncio",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-3xl font-display font-bold">Editar Anúncio</h1>
                <p className="text-muted-foreground">Atualiza os detalhes do teu artigo</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Images Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    Fotografias
                  </CardTitle>
                  <CardDescription>
                    Adiciona ou remove fotografias. A primeira será a imagem principal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted">
                        <img src={img.url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
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
                    {images.length < 5 && (
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

              {/* Pricing Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Preço (SwapCoins)
                  </CardTitle>
                  <CardDescription>
                    Define o valor do artigo em SwapCoins
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  {/* Info Box */}
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
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button type="button" variant="outline" className="h-12 px-8" onClick={() => navigate("/profile")} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    "Guardar Alterações"
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

export default EditListing;
