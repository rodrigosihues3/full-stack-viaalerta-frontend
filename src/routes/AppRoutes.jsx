import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "../components/ProtectedRoute";

// Vistas provisionales para verificar navegación
const CitizenPlaceholder = () => (
  <div className="p-6 max-w-lg mx-auto">
    <h1 className="text-xl font-bold">Portal Ciudadano (VíaAlerta)</h1>
    <p className="text-slate-600 mt-2">
      Módulo de captura de incidentes viales.
    </p>
  </div>
);

const DashboardPlaceholder = () => (
  <div className="p-6">
    <h1 className="text-xl font-bold">Panel de Operaciones Municipal</h1>
    <p className="text-slate-600 mt-2">
      Vista protegida exclusiva para operadores autorizados.
    </p>
  </div>
);

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<CitizenPlaceholder />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
