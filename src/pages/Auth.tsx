import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(3, "Username ou email inválido"),
  password: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    email: "",
    password: "",
    username: "",
    fullName: "",
    referralCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ identifier: formData.identifier, password: formData.password });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.identifier, formData.password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Erro de login",
              description: "Username/email ou password incorretos.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Bem-vindo de volta!",
            description: "Login efetuado com sucesso.",
          });
          navigate("/");
        }
      } else {
        const validation = signupSchema.safeParse(formData);
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        if (!acceptedTerms) {
          setErrors({ terms: "Deves aceitar os Termos e Condições." });
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, {
          username: formData.username,
          full_name: formData.fullName,
        });
        
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Conta já existe",
              description: "Este email já está registado. Tenta fazer login.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Process referral code if provided
          if (formData.referralCode.trim()) {
            // Wait briefly for the profile to be created by the trigger
            setTimeout(async () => {
              const { data: { user: newUser } } = await supabase.auth.getUser();
              if (newUser) {
                await supabase.rpc('process_referral', {
                  p_new_user_id: newUser.id,
                  p_referral_code: formData.referralCode.trim(),
                });
              }
            }, 2000);
          }
          toast({
            title: "Conta criada!",
            description: "Bem-vindo ao PieceSwap!",
          });
          navigate("/");
        }
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início</span>
        </Link>

        <Card className="border-0 card-shadow">
          <CardHeader className="text-center pb-2">
            <Link to="/" className="inline-block mb-4">
              <h1 className="text-2xl font-display font-bold text-gradient">PieceSwap</h1>
            </Link>
            <CardTitle className="text-2xl font-display">
              {isLogin ? "Entrar" : "Criar Conta"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Bem-vindo de volta! Entra na tua conta."
                : "Junta-te à maior comunidade de LEGO em Portugal!"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="O teu nome"
                        value={formData.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input
                        id="username"
                        placeholder="o_teu_username"
                        value={formData.username}
                        onChange={(e) => handleChange("username", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.username && (
                      <p className="text-xs text-destructive">{errors.username}</p>
                    )}
                  </div>
                </>
              )}

              {isLogin ? (
                <div className="space-y-2">
                  <Label htmlFor="identifier">Username ou Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="identifier"
                      placeholder="username ou joao@exemplo.com"
                      value={formData.identifier}
                      onChange={(e) => handleChange("identifier", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.identifier && (
                    <p className="text-xs text-destructive">{errors.identifier}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="joao@exemplo.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Referral code for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Código de Referral <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="referralCode"
                      placeholder="Ex: A1B2C3D4"
                      value={formData.referralCode}
                      onChange={(e) => handleChange("referralCode", e.target.value.toUpperCase())}
                      className="pl-10 uppercase"
                      maxLength={8}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Tens um código de um amigo? Ambos recebem 25 SwapCoins!</p>
                </div>
              )}

              {/* Terms checkbox for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => {
                        setAcceptedTerms(checked === true);
                        setErrors((prev) => ({ ...prev, terms: "" }));
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                      Li e aceito os{" "}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline">
                        Termos e Condições
                      </Link>
                    </Label>
                  </div>
                  {errors.terms && (
                    <p className="text-xs text-destructive">{errors.terms}</p>
                  )}
                </div>
              )}

              {/* Forgot password link for login */}
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueceste a password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? "A processar..." : isLogin ? "Entrar" : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Não tens conta?" : "Já tens conta?"}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                    setAcceptedTerms(false);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isLogin ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForgotPassword(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-0 card-shadow">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-display">Recuperar Password</CardTitle>
                <CardDescription>Introduz o teu email para receber um link de recuperação.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!forgotEmail) return;
                    setForgotLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast({ title: "Email enviado!", description: "Verifica a tua caixa de correio." });
                      setShowForgotPassword(false);
                      setForgotEmail("");
                    } catch (err: any) {
                      toast({ title: "Erro", description: err.message || "Não foi possível enviar o email.", variant: "destructive" });
                    } finally {
                      setForgotLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="joao@exemplo.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForgotPassword(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={forgotLoading}>
                      {forgotLoading ? "A enviar..." : "Enviar Link"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Auth;
