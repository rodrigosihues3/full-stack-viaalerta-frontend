import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDemoAccounts, registerCitizen } from "../services/authServices";
import { ShieldAlert, Lock, UserCheck, AlertCircle, Loader2, Mail, UserRound, BadgeCheck } from "lucide-react";

export const LoginPage = () => {
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState({ dni: "", name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const changeMode = (nextMode) => { setMode(nextMode); setError(null); };
  const handleLogin = async (event) => {
    event.preventDefault(); setError(null);
    if (!identifier || !password) return setError("Todos los campos son obligatorios.");
    try {
      setIsSubmitting(true);
      const user = await login(identifier, password);
      navigate(user.role === "SUPER_ADMIN" ? "/admin/dashboard" : user.role === "OPERADOR_ENTIDAD" ? "/entidad/dashboard" : "/", { replace: true });
    } catch (err) { setError(err.message || "Error al autenticar credenciales."); }
    finally { setIsSubmitting(false); }
  };
  const handleRegistration = async (event) => {
    event.preventDefault(); setError(null);
    if (!/^\d{8}$/.test(registration.dni)) return setError("El DNI debe contener exactamente 8 digitos numericos.");
    if (!registration.name.trim() || !registration.email.trim() || !registration.password) return setError("Complete todos los campos para crear su cuenta.");
    try {
      setIsSubmitting(true);
      await registerCitizen(registration);
      await login(registration.dni, registration.password);
      navigate("/", { replace: true });
    } catch (err) { setError(err.message || "No fue posible crear la cuenta."); }
    finally { setIsSubmitting(false); }
  };
  const setQuickAccount = (account) => { setIdentifier(account.id); setPassword(account.pass); setError(null); };

  return <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex flex-col items-center"><div className="mb-3 rounded-lg bg-[#081D30] p-3 text-white"><ShieldAlert size={28} /></div><h1 className="text-xl font-bold text-slate-800">Sistema ViaAlerta</h1><p className="mt-1 text-center text-xs text-slate-500">Plataforma Unificada de Control e Incidentes Viales</p></div>
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-xs font-bold">
        <button type="button" onClick={() => changeMode("login")} className={`rounded-md px-3 py-2 transition ${mode === "login" ? "bg-white text-[#081D30] shadow-sm" : "text-slate-500"}`}>Iniciar Sesion</button>
        <button type="button" onClick={() => changeMode("register")} className={`rounded-md px-3 py-2 transition ${mode === "register" ? "bg-white text-[#081D30] shadow-sm" : "text-slate-500"}`}>Registrarse</button>
      </div>
      {error && <div className="mb-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={16} className="shrink-0" /><span>{error}</span></div>}
      {mode === "login" ? <form onSubmit={handleLogin} className="space-y-4">
        <Field label="DNI o Correo Institucional" icon={<UserCheck size={18} />} value={identifier} onChange={setIdentifier} placeholder="73232323 u operador@mml.gob.pe" disabled={isSubmitting} />
        <Field label="Contrasena" icon={<Lock size={18} />} value={password} onChange={setPassword} placeholder="Ingrese su contrasena" type="password" disabled={isSubmitting} />
        <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50">{isSubmitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Validando identidad...</> : "Ingresar al Sistema"}</button>
      </form> : <form onSubmit={handleRegistration} className="space-y-3">
        <Field label="DNI" icon={<BadgeCheck size={18} />} value={registration.dni} onChange={(value) => setRegistration({ ...registration, dni: value.replace(/\D/g, "").slice(0, 8) })} placeholder="8 digitos" inputMode="numeric" disabled={isSubmitting} />
        <Field label="Nombres y Apellidos" icon={<UserRound size={18} />} value={registration.name} onChange={(value) => setRegistration({ ...registration, name: value })} placeholder="Ingrese sus nombres completos" disabled={isSubmitting} />
        <Field label="Correo Electronico" icon={<Mail size={18} />} value={registration.email} onChange={(value) => setRegistration({ ...registration, email: value })} placeholder="nombre@correo.pe" type="email" disabled={isSubmitting} />
        <Field label="Contrasena" icon={<Lock size={18} />} value={registration.password} onChange={(value) => setRegistration({ ...registration, password: value })} placeholder="Cree una contrasena" type="password" disabled={isSubmitting} />
        <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50">{isSubmitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Creando cuenta...</> : "Crear Cuenta Ciudadana"}</button>
        <p className="text-center text-xs text-slate-500">Ya posee credenciales? <button type="button" onClick={() => changeMode("login")} className="font-bold text-[#081D30] hover:underline">Iniciar Sesion</button></p>
      </form>}
      {mode === "login" && <div className="mt-6 border-t border-slate-200 pt-4"><p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Cuentas Demo para Evaluacion</p><div className="grid grid-cols-2 gap-1.5">{getDemoAccounts().map((account) => <button type="button" key={account.label} onClick={() => setQuickAccount(account)} className="rounded border border-slate-200 bg-slate-50 p-1.5 text-left text-[10px] transition hover:bg-slate-100"><span className="block truncate font-bold text-slate-700">{account.label}</span><span className="block truncate text-slate-400">{account.id}</span></button>)}</div></div>}
    </div>
  </div>;
};

const Field = ({ label, icon, value, onChange, placeholder, type = "text", inputMode, disabled }) => <div><label className="mb-1 block text-xs font-bold uppercase text-slate-700">{label}</label><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">{icon}</span><input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="w-full rounded border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#081D30] disabled:bg-slate-100" /></div></div>;
