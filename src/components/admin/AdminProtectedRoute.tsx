import { Navigate } from "react-router-dom";
import { useAdminAuth, AppRole } from "@/hooks/useAdminAuth";
import { useAuth } from "@/hooks/useAuth";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

const AdminProtectedRoute = ({ children, requiredRoles }: AdminProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAdminAccess, hasAnyRole, loading: roleLoading } = useAdminAuth();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">A verificar permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
          <p className="mt-2 text-muted-foreground">Não tens permissões para aceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
