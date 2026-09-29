import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <span className="text-xs font-semibold text-slate-600">
          Verificando autorización...
        </span>
      </div>
    );
  }

  // 1. Validar autenticación
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Validar privilegios por rol
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirigir a la vista nativa del usuario según su rol
    if (user.role === "SUPER_ADMIN")
      return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "OPERADOR_ENTIDAD")
      return <Navigate to="/entidad/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};
