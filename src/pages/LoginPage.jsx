import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getDemoAccounts,
  registerCitizen,
  consultarDniDecolecta,
} from "../services/authServices";
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
  Sparkles,
  X,
  Search,
  XCircle,
} from "lucide-react";

const isPasswordStrong = (pass) =>
  pass.length >= 8 &&
  /[A-Z]/.test(pass) &&
  /[a-z]/.test(pass) &&
  /[0-9]/.test(pass) &&
  /[!@#$%^&*(),.?":{}|<>_-]/.test(pass);

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
    confirmPassword: "",
  });
  const [touchedFields, setTouchedFields] = useState({
    dni: false,
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isDniSearching, setIsDniSearching] = useState(false);
  const [dniNotFound, setDniNotFound] = useState(false);
  const [isNameAutoFilled, setIsNameAutoFilled] = useState(false);

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const demoRef = useRef(null);

  const contentRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState("auto");

  const { login, completar2FA, cancelar2FA } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (demoRef.current && !demoRef.current.contains(event.target)) {
        setIsDemoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      setContainerHeight(`${contentRef.current.scrollHeight}px`);
    }
  }, [mode, dniNotFound, touchedFields, registration.name, error]);

  const markTouched = (field) => {
    setTouchedFields((prev) =>
      prev[field] ? prev : { ...prev, [field]: true }
    );
  };

  const validations = {
    dni: /^\d{8}$/.test(registration.dni),
    name: registration.name.trim().length >= 3,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email),
    password: isPasswordStrong(registration.password),
    confirmPassword:
      registration.confirmPassword.length >= 8 &&
      registration.confirmPassword === registration.password,
  };

  const getValidationMessage = (field) => {
    if (!touchedFields[field] || validations[field]) return null;

    switch (field) {
      case "dni":
        return "Debe contener 8 dígitos numéricos";
      case "name":
        return "Ingrese al menos 3 caracteres válidos";
      case "email":
        return "Ingrese un formato de correo válido (ej. usuario@correo.pe)";
      case "password":
        return "Mínimo 8 caracteres con mayúscula, número y símbolo";
      case "confirmPassword":
        if (!registration.confirmPassword) {
          return "Confirme su contraseña";
        }
        return "Las contraseñas no coinciden";
      default:
        return null;
    }
  };

  const ejecutarBusquedaDni = async (dniValue) => {
    const targetDni = dniValue || registration.dni;
    if (!targetDni || targetDni.length !== 8 || isDniSearching) return;

    setIsDniSearching(true);
    setDniNotFound(false);

    try {
      const res = await consultarDniDecolecta(targetDni);
      const nombreCompleto =
        res?.nombreCompleto ||
        [res?.nombres, res?.apellidos].filter(Boolean).join(" ").trim() ||
        res?.nombres ||
        "";

      if (res && nombreCompleto) {
        setRegistration((prev) => ({
          ...prev,
          dni: targetDni,
          name: nombreCompleto,
        }));
        setIsNameAutoFilled(true);
        markTouched("name");
        setDniNotFound(false);
      } else {
        setDniNotFound(true);
        setIsNameAutoFilled(false);
      }
    } catch {
      setDniNotFound(true);
      setIsNameAutoFilled(false);
    } finally {
      setIsDniSearching(false);
    }
  };

  const handleDniChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 8);
    if (dniNotFound) {
      setDniNotFound(false);
    }
    if (clean.length > 0) {
      markTouched("dni");
    }
    setRegistration((prev) => ({ ...prev, dni: clean }));
    if (isNameAutoFilled) {
      setIsNameAutoFilled(false);
    }
    if (clean.length === 8 && clean !== registration.dni) {
      ejecutarBusquedaDni(clean);
    }
  };

  const handleClearDniAutoFill = () => {
    setIsNameAutoFilled(false);
    setRegistration((prev) => ({ ...prev, dni: "", name: "" }));
    setDniNotFound(false);
    setTouchedFields((prev) => ({ ...prev, dni: false, name: false }));
  };

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
    setDniNotFound(false);
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

    // Marcar todos los campos como tocados
    setTouchedFields({
      dni: true,
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

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
    if (!isPasswordStrong(registration.password)) {
      return setError(
        "La contraseña debe contener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo."
      );
    }
    if (registration.password !== registration.confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      setIsSubmitting(true);
      await registerCitizen({
        dni: registration.dni,
        name: registration.name,
        email: registration.email,
        password: registration.password,
      });

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

  const handleSelectDemoAccount = (account) => {
    if (mode !== "login") {
      setMode("login");
    }
    setQuickAccount(account);
    setIsDemoOpen(false);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return {
          label: "Admin",
          className: "border-purple-200 bg-purple-50 text-purple-700",
        };
      case "OPERADOR_ENTIDAD":
        return {
          label: "Operador",
          className: "border-blue-200 bg-blue-50 text-blue-700",
        };
      default:
        return {
          label: "Ciudadano",
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        };
    }
  };

  const dniRightAction = (
    <>
      {isDniSearching ? (
        <span className="flex items-center text-slate-400">
          <Loader2 size={16} className="animate-spin text-[#081D30]" />
        </span>
      ) : isNameAutoFilled ? (
        <button
          type="button"
          onClick={handleClearDniAutoFill}
          className="flex items-center rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition cursor-pointer"
          title="Borrar DNI y datos consultados"
        >
          <XCircle size={16} />
        </button>
      ) : (
        <button
          type="button"
          disabled={registration.dni.length < 8 || isDniSearching}
          onClick={() => ejecutarBusquedaDni(registration.dni)}
          className={`flex items-center rounded p-1 text-slate-500 transition ${
            registration.dni.length < 8
              ? "opacity-35 cursor-not-allowed"
              : "hover:bg-slate-100 hover:text-[#081D30] cursor-pointer"
          }`}
          title={
            registration.dni.length < 8
              ? "Ingrese 8 dígitos para consultar"
              : "Consultar datos en RENIEC"
          }
        >
          <Search size={16} />
        </button>
      )}
    </>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* ENCABEZADO INSTITUCIONAL */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 rounded-lg bg-[#081D30] p-3 text-white">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Sistema VíaAlerta</h1>
          <p className="mt-1 text-center text-xs text-slate-500">
            Plataforma Unificada de Control e Incidentes Viales
          </p>

          {/* SEPARADOR VISUAL EN CABECERA */}
          <div className="my-4 w-full border-b border-slate-200" />

          {mode === "login" && (
            <h2 className="text-center text-sm font-bold uppercase tracking-wider text-slate-700">
              Iniciar Sesión
            </h2>
          )}
          {mode === "register" && (
            <h2 className="text-center text-sm font-bold uppercase tracking-wider text-slate-700">
              Registro Ciudadano
            </h2>
          )}
        </div>

        {error && (
          <div className="mb-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* CONTENEDOR CON TRANSICIÓN ORGÁNICA DE ALTURA ENTRE VISTAS */}
        <div
          style={{ height: containerHeight }}
          className="transition-[height] duration-400 ease-in-out overflow-hidden"
        >
          <div ref={contentRef}>
            {/* MODO 2FA: VERIFICACIÓN TOTP */}
            {mode === "2fa" && (
              <form onSubmit={handleVerify2FA} className="animate-in fade-in duration-200 space-y-4">
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
                  className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
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
                  className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Volver a ingresar credenciales
                </button>
              </form>
            )}

            {/* MODO LOGIN TRADICIONAL */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="animate-in fade-in duration-200 space-y-4">
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
                  className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
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

                <p className="mt-4 text-center text-xs text-slate-500">
                  ¿No cuenta con una credencial?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("register")}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Regístrese aquí
                  </button>
                </p>
              </form>
            )}

            {/* MODO REGISTRO CIUDADANO */}
            {mode === "register" && (
              <form onSubmit={handleRegistration} className="animate-in fade-in duration-200 space-y-3">
                {/* CAMPO DNI */}
                <div>
                  <Field
                    label="DNI"
                    icon={<BadgeCheck size={18} />}
                    value={registration.dni}
                    onChange={handleDniChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && registration.dni.length === 8) {
                        e.preventDefault();
                        ejecutarBusquedaDni(registration.dni);
                      }
                    }}
                    placeholder="8 dígitos"
                    inputMode="numeric"
                    disabled={isSubmitting}
                    isValid={validations.dni}
                    isTouched={touchedFields.dni}
                    errorText={!dniNotFound ? getValidationMessage("dni") : null}
                    rightAction={dniRightAction}
                  />
                  {dniNotFound && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">
                      No se encontraron datos para el DNI ingresado
                    </p>
                  )}
                </div>

                {/* CAMPO NOMBRES Y APELLIDOS CON CRECIMIENTO VERTICAL */}
                <Field
                  label="Nombres y Apellidos"
                  icon={<UserRound size={18} />}
                  value={registration.name}
                  onChange={(value) => {
                    if (!isNameAutoFilled) {
                      if (value.length > 0) markTouched("name");
                      setRegistration({ ...registration, name: value });
                    }
                  }}
                  autoComplete="name"
                  placeholder={
                    isNameAutoFilled
                      ? "Completado vía RENIEC"
                      : "Ingrese sus nombres completos"
                  }
                  disabled={isSubmitting}
                  readOnly={isNameAutoFilled}
                  isValid={validations.name}
                  isTouched={touchedFields.name}
                  errorText={getValidationMessage("name")}
                  isMultiline={true}
                />

                {/* CAMPO CORREO ELECTRÓNICO */}
                <Field
                  label="Correo Electrónico"
                  icon={<Mail size={18} />}
                  value={registration.email}
                  onChange={(value) => {
                    if (value.length > 0) markTouched("email");
                    setRegistration({ ...registration, email: value });
                  }}
                  autoComplete="email"
                  placeholder="nombre@correo.pe"
                  type="email"
                  disabled={isSubmitting}
                  isValid={validations.email}
                  isTouched={touchedFields.email}
                  errorText={getValidationMessage("email")}
                />

                {/* CAMPO CONTRASEÑA */}
                <Field
                  label="Contraseña"
                  icon={<Lock size={18} />}
                  value={registration.password}
                  onChange={(value) => {
                    if (value.length > 0) markTouched("password");
                    setRegistration({ ...registration, password: value });
                  }}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres, mayúscula, número y símbolo"
                  type="password"
                  disabled={isSubmitting}
                  isValid={validations.password}
                  isTouched={touchedFields.password}
                  errorText={getValidationMessage("password")}
                />

                {/* CAMPO CONFIRMAR CONTRASEÑA */}
                <Field
                  label="Confirmar Contraseña"
                  icon={<Lock size={18} />}
                  value={registration.confirmPassword}
                  onChange={(value) => {
                    if (value.length > 0) markTouched("confirmPassword");
                    setRegistration({
                      ...registration,
                      confirmPassword: value,
                    });
                  }}
                  autoComplete="new-password"
                  placeholder="Repita su contraseña"
                  type="password"
                  disabled={isSubmitting}
                  isValid={validations.confirmPassword}
                  isTouched={touchedFields.confirmPassword}
                  errorText={getValidationMessage("confirmPassword")}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded bg-[#081D30] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
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

                <p className="mt-4 text-center text-xs text-slate-500">
                  ¿Ya posee credenciales?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("login")}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON (FAB) PARA CUENTAS DEMO */}
      <div
        ref={demoRef}
        onMouseEnter={() => setIsDemoOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end"
      >
        {isDemoOpen && (
          <div className="animate-popover mb-3 w-64 sm:w-72 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cuentas de Prueba
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                title="Cerrar"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mb-2 text-[11px] text-slate-500">
              Seleccione una cuenta para autocompletar credenciales:
            </p>

            <div className="space-y-1.5">
              {getDemoAccounts().map((account) => {
                const badge = getRoleBadge(account.role);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleSelectDemoAccount(account)}
                    className="group flex w-full flex-col rounded-lg border border-slate-100 bg-slate-50/70 p-2 text-left transition hover:border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-slate-700 group-hover:text-blue-600">
                        {account.label}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-0.2 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="mt-0.5 truncate text-[11px] text-slate-400">
                      {account.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsDemoOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#081D30] px-4 py-2.5 text-xs font-semibold text-white shadow-xl transition-all duration-200 hover:bg-slate-800 hover:shadow-2xl cursor-pointer"
          title="Cuentas Demo para Evaluación"
        >
          <Sparkles size={16} className="text-amber-400" />
          <span>Cuentas Demo</span>
        </button>
      </div>
    </div>
  );
};

const Field = ({
  label,
  icon,
  value,
  onChange,
  onKeyDown,
  placeholder,
  type = "text",
  inputMode,
  disabled,
  readOnly = false,
  autoComplete,
  isValid = false,
  isTouched = false,
  errorText = null,
  rightAction = null,
  isMultiline = false,
}) => {
  const hasError = isTouched && !isValid;

  let iconColorClass = "text-slate-400";
  if (isValid) {
    iconColorClass = "text-emerald-600";
  } else if (hasError) {
    iconColorClass = "text-red-500";
  }

  let borderAndRingClass =
    "border-slate-300 focus:border-[#081D30] focus:ring-2 focus:ring-[#081D30]";
  if (isValid) {
    borderAndRingClass =
      "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500";
  } else if (hasError) {
    borderAndRingClass =
      "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400";
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span
          className={`absolute left-0 flex items-center pl-3 transition-colors ${
            isMultiline ? "top-2.5" : "inset-y-0"
          } ${iconColorClass}`}
        >
          {icon}
        </span>

        {isMultiline ? (
          <textarea
            rows={value.length > 30 ? 2 : 1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={`w-full resize-none rounded border py-2 pl-10 text-sm outline-none transition disabled:bg-slate-100 ${
              readOnly ? "bg-slate-100 cursor-not-allowed text-slate-700" : ""
            } ${rightAction ? "pr-10" : "pr-3"} ${borderAndRingClass}`}
          />
        ) : (
          <input
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={`w-full rounded border py-2 pl-10 text-sm outline-none transition disabled:bg-slate-100 ${
              readOnly ? "bg-slate-100 cursor-not-allowed text-slate-700" : ""
            } ${rightAction ? "pr-10" : "pr-3"} ${borderAndRingClass}`}
          />
        )}

        {rightAction && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            {rightAction}
          </div>
        )}
      </div>

      {hasError && Boolean(errorText) && (
        <p className="mt-1 text-[11px] text-red-500 animate-in fade-in">
          {errorText}
        </p>
      )}
    </div>
  );
};
