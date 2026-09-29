import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import { CitizenPortalPage } from "../pages/CitizenPortalPage";
import { EntityDashboardPage } from "../pages/EntityDashboardPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { ProtectedRoute } from "../components/ProtectedRoute";

const RootRouter = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white text-xs">
        Cargando sistema...
      </div>
    );
  }

  // Muro de autenticación
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Despacho determinista por rol
  if (user.role === "OPERADOR_ENTIDAD") {
    return <Navigate to="/entidad/dashboard" replace />;
  }
  if (user.role === "SUPER_ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <CitizenPortalPage />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRouter />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Panel Operativo de Entidades (MML y Sedapal) */}
      <Route
        path="/entidad/dashboard"
        element={
          <ProtectedRoute allowedRoles={["OPERADOR_ENTIDAD"]}>
            <EntityDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Consola Central Super Administrador */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
