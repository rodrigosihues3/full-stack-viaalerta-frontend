import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDemoAccounts, registerCitizen } from "../services/authServices";
import {
  ShieldAlert,
  Lock,
  UserCheck,
  AlertCircle,
  Loader2,
  Mail,
  UserRound,
  BadgeCheck,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

export const LoginPage = () => {
  const [mode, setMode] = useState("login"); // "login" | "register" | "2fa"
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [registration, setRegistration] = useState({
    dni: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, completar2FA, cancelar2FA } = useAuth();
  const navigate = useNavigate();

  const handleRedirectByRole = (user) => {
    const role = user?.role || user?.rol;
    if (role === "SUPER_ADMIN") {
      navigate("/admin/dashboard", { replace: true });
    } else if (role === "OPERADOR_ENTIDAD") {
      navigate("/entidad/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    if (!identifier || !password) {
      return setError("Todos los campos son obligatorios.");
    }

    try {
      setIsSubmitting(true);
      const res = await login(identifier, password);

      if (res?.requiere2FA) {
        setTwoFactorCode("");
        setMode("2fa");
      } else if (res) {
        handleRedirectByRole(res);
      }
    } catch (err) {
      setError(err.message || "Error al autenticar credenciales.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (event) => {
    event.preventDefault();
    setError(null);
    const cleanCode = twoFactorCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      return setError("Ingrese el código TOTP completo de 6 dígitos.");
    }

    try {
      setIsSubmitting(true);
      const user = await completar2FA(cleanCode);
      handleRedirectByRole(user);
    } catch (err) {
      setError(err.message || "Código 2FA incorrecto o expirado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackFrom2FA = () => {
    cancelar2FA();
    setTwoFactorCode("");
    setError(null);
    setMode("login");
  };

  const handleRegistration = async (event) => {
    event.preventDefault();
    setError(null);
    if (!/^\d{8}$/.test(registration.dni)) {
      return setError("El DNI debe contener exactamente 8 dígitos numéricos.");
    }
    if (
      !registration.name.trim() ||
      !registration.email.trim() ||
      !registration.password
    ) {
      return setError("Complete todos los campos para crear su cuenta.");
    }

    try {
      setIsSubmitting(true);
      await registerCitizen(registration);
      // Tras registrarse, iniciar sesión con las nuevas credenciales
      const loginRes = await login(registration.email, registration.password);
      if (loginRes?.requiere2FA) {
        setMode("2fa");
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "No fue posible crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickAccount = (account) => {
    setIdentifier(account.id);
    setPassword(account.pass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 rounded-lg bg-[#081D30] p-3 text-white">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Sistema VíaAlerta</h1>
          <p className="mt-1 text-center text-xs text-slate-500">
            Plataforma Unificada de Control e Incidentes Viales
          </p>
        </div>

        {mode !== "2fa" && (
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => changeMode("login")}
              className={`rounded-md px-3 py-2 transition ${
                mode === "login"
                  ? "bg-white text-[#081D30] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => changeMode("register")}
              className={`rounded-md px-3 py-2 transition ${
                mode === "register"
                  ? "bg-white text-[#081D30] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Registrarse
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MODO 2FA: VERIFICACIÓN TOTP */}
        {mode === "2fa" && (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-[#081D30]">
                <KeyRound size={20} />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Segundo Factor de Autenticación
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Esta cuenta tiene la protección 2FA activada. Ingrese el código
                de 6 dígitos generado por su aplicación de autenticación (Google
                Authenticator, Authy, etc.).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-center text-xs font-bold uppercase text-slate-700">
                Código TOTP (6 dígitos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                disabled={isSubmitting}
                autoFocus
                className="w-full rounded border border-slate-300 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-[#081D30] disabled:bg-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || twoFactorCode.length < 6}
              className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Verificando código...
                </>
              ) : (
                "Verificar y Acceder"
              )}
            </button>

            <button
              type="button"
              onClick={handleBackFrom2FA}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={14} /> Volver a ingresar credenciales
            </button>
          </form>
        )}

        {/* MODO LOGIN TRADICIONAL */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field
              label="Correo o DNI Institucional"
              icon={<UserCheck size={18} />}
              value={identifier}
              onChange={setIdentifier}
              autoComplete="username"
              placeholder="ciudadano@correo.pe u operaciones@mml.gob.pe"
              disabled={isSubmitting}
            />
            <Field
              label="Contraseña"
              icon={<Lock size={18} />}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="Ingrese su contraseña"
              type="password"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Validando identidad...
                </>
              ) : (
                "Ingresar al Sistema"
              )}
            </button>
          </form>
        )}

        {/* MODO REGISTRO CIUDADANO */}
        {mode === "register" && (
          <form onSubmit={handleRegistration} className="space-y-3">
            <Field
              label="DNI"
              icon={<BadgeCheck size={18} />}
              value={registration.dni}
              onChange={(value) =>
                setRegistration({
                  ...registration,
                  dni: value.replace(/\D/g, "").slice(0, 8),
                })
              }
              placeholder="8 dígitos"
              inputMode="numeric"
              disabled={isSubmitting}
            />
            <Field
              label="Nombres y Apellidos"
              icon={<UserRound size={18} />}
              value={registration.name}
              onChange={(value) =>
                setRegistration({ ...registration, name: value })
              }
              autoComplete="name"
              placeholder="Ingrese sus nombres completos"
              disabled={isSubmitting}
            />
            <Field
              label="Correo Electrónico"
              icon={<Mail size={18} />}
              value={registration.email}
              onChange={(value) =>
                setRegistration({ ...registration, email: value })
              }
              autoComplete="email"
              placeholder="nombre@correo.pe"
              type="email"
              disabled={isSubmitting}
            />
            <Field
              label="Contraseña"
              icon={<Lock size={18} />}
              value={registration.password}
              onChange={(value) =>
                setRegistration({ ...registration, password: value })
              }
              autoComplete="new-password"
              placeholder="Cree una contraseña"
              type="password"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear Cuenta Ciudadana"
              )}
            </button>
            <p className="text-center text-xs text-slate-500">
              ¿Ya posee credenciales?{" "}
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="font-bold text-[#081D30] hover:underline"
              >
                Iniciar Sesión
              </button>
            </p>
          </form>
        )}

        {/* ACCESOS DEMO RÁPIDOS */}
        {mode === "login" && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cuentas Demo para Evaluación
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {getDemoAccounts().map((account) => (
                <button
                  type="button"
                  key={account.label}
                  onClick={() => setQuickAccount(account)}
                  className="rounded border border-slate-200 bg-slate-50 p-1.5 text-left text-[10px] transition hover:bg-slate-100"
                >
                  <span className="block truncate font-bold text-slate-700">
                    {account.label}
                  </span>
                  <span className="block truncate text-slate-400">
                    {account.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  disabled,
  autoComplete,
}) => (
  <div>
    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
      {label}
    </label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        {icon}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#081D30] disabled:bg-slate-100"
      />
    </div>
  </div>
);
