import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminProtectedRoute from "./AdminProtectedRoute";

const AdminLayout = () => {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen flex bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminLayout;
