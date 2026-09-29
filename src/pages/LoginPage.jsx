import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDemoAccounts } from "../services/authServices";
import {
  ShieldAlert,
  Lock,
  UserCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRedirectByRole = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        navigate("/admin/dashboard", { replace: true });
        break;
      case "OPERADOR_ENTIDAD":
        navigate("/entidad/dashboard", { replace: true });
        break;
      case "CIUDADANO":
      default:
        navigate("/", { replace: true });
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(identifier, password);
      handleRedirectByRole(user.role);
    } catch (err) {
      setError(err.message || "Error al autenticar credenciales.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickAccount = (acc) => {
    setIdentifier(acc.id);
    setPassword(acc.pass);
    setError(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-6 sm:p-8 border border-slate-200">
        {/* Cabecera del Formulario */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-[#081D30] rounded-lg text-white mb-3">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Sistema VíaAlerta
          </h2>
          <p className="text-xs text-slate-500 text-center mt-1">
            Plataforma Unificada de Control e Incidentes Viales
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              DNI o Correo Institucional
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <UserCheck size={18} />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="73232323 u operador@mml.gob.pe"
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#081D30] focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#081D30] focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-[#081D30] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Validando Identidad...
              </>
            ) : (
              "Ingresar al Sistema"
            )}
          </button>
        </form>

        {/* Panel de Credenciales Demo para Sustentación */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2">
            Cuentas Demo para Evaluación
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {getDemoAccounts().map((acc) => (
              <button
                type="button"
                key={acc.label}
                onClick={() => setQuickAccount(acc)}
                className="p-1.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] transition"
              >
                <span className="font-bold text-slate-700 block truncate">
                  {acc.label}
                </span>
                <span className="text-slate-400 block truncate">{acc.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
