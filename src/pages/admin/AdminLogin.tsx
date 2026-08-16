import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  
  const { signIn, user } = useAuth();
  const { hasAdminAccess, loading: roleLoading } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && user && hasAdminAccess) {
      navigate("/admin");
    }
  }, [user, hasAdminAccess, roleLoading, navigate]);

  useEffect(() => {
    // Check lockout from localStorage
    const storedLockout = localStorage.getItem("admin_lockout");
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (Date.now() < lockoutTime) {
        setLockoutEnd(lockoutTime);
      } else {
        localStorage.removeItem("admin_lockout");
        localStorage.removeItem("admin_attempts");
      }
    }

    const storedAttempts = localStorage.getItem("admin_attempts");
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10));
    }
  }, []);

  const isLockedOut = lockoutEnd !== null && Date.now() < lockoutEnd;

  const logLoginAttempt = async (identifier: string, success: boolean) => {
    try {
      await (supabase.from('login_attempts' as any) as any).insert({
        identifier,
        success,
      });
    } catch (e) {
      // Silently fail - this is just for tracking
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut) {
      toast({
        title: "Conta bloqueada",
        description: "Muitas tentativas falhadas. Tenta novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await logLoginAttempt(email, false);

      const { error } = await signIn(email, password);

      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem("admin_attempts", newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutTime = Date.now() + LOCKOUT_DURATION;
          setLockoutEnd(lockoutTime);
          localStorage.setItem("admin_lockout", lockoutTime.toString());
          
          toast({
            title: "Conta bloqueada",
            description: `Muitas tentativas falhadas. Tenta novamente em 15 minutos.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro de autenticação",
            description: `Credenciais inválidas. Tentativas restantes: ${MAX_ATTEMPTS - newAttempts}`,
            variant: "destructive",
          });
        }
        return;
      }

      await logLoginAttempt(email, true);

      // Clear attempts on success
      localStorage.removeItem("admin_attempts");
      localStorage.removeItem("admin_lockout");
      setAttempts(0);

      // Role check happens in useEffect after auth state updates
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante o login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRemainingLockoutTime = () => {
    if (!lockoutEnd) return "";
    const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000 / 60);
    return `${remaining} minuto${remaining !== 1 ? "s" : ""}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <CardDescription>
              Acesso restrito a administradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@pieceswap.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLockedOut}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLockedOut}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {isLockedOut && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    Conta temporariamente bloqueada. Tenta novamente em {getRemainingLockoutTime()}.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isLockedOut}
              >
                {isLoading ? "A entrar..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
