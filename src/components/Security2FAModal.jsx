import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { setup2FA, activate2FA } from "../services/authServices";
import {
  ShieldAlert,
  ShieldCheck,
  QrCode,
  Key,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  RefreshCw,
} from "lucide-react";

/**
 * Modal de Seguridad y Configuración 2FA.
 * Implementa el flujo de tres estados:
 * - Estado 1: Botón "Activar Protección en Dos Pasos (2FA)" e información de seguridad.
 * - Estado 2: Petición a setup2FA(), renderizado de QR en Base64 y secreto Base32.
 * - Estado 3: Campo numérico de 6 dígitos con botón "Confirmar y Activar".
 * Al recibir HTTP 200 consolida el segundo factor y refleja el distintivo "2FA Activo".
 */
const Security2FAModalDialog = ({ onClose, onSuccess }) => {
  const { user, marcar2FAActivo } = useAuth();

  // Estados del flujo: 'initial' | 'qr' | 'confirm' | 'success' | 'active'
  const [step, setStep] = useState(() =>
    user?.dos_pasos_activo ? "active" : "initial"
  );
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrError, setQrError] = useState(null);

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [copied, setCopied] = useState(false);

  // Cerrar con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  // Iniciar configuración (Estado 1 -> Estado 2)
  const handleStartSetup = async () => {
    setIsLoadingQR(true);
    setQrError(null);
    setSubmitError(null);
    setCode("");
    setStep("qr");

    try {
      const data = await setup2FA();
      setQrData(data);
    } catch (err) {
      if (err.status === 409 || err.message?.includes("ya está activo")) {
        marcar2FAActivo();
        setStep("active");
        setIsLoadingQR(false);
        return;
      }
      console.error("Error al obtener credenciales 2FA:", err);
      setQrError(
        err.message ||
          "No fue posible generar el código QR. Verifique su conexión al servidor e intente nuevamente."
      );
    } finally {
      setIsLoadingQR(false);
    }
  };

  // Copiar clave manual Base32 al portapapeles
  const handleCopySecret = async () => {
    if (!qrData?.secreto) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(qrData.secreto);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = qrData.secreto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Error al copiar clave manual:", err);
    }
  };

  // Manejo de entrada del código numérico
  const handleCodeChange = (e) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(clean);
    if (submitError) setSubmitError(null);
  };

  // Enviar código para consolidar activación (Estado 3)
  const handleActivate = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      setSubmitError("Debe ingresar el código TOTP completo de 6 dígitos.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await activate2FA(cleanCode);

      // Actualizar contexto global
      marcar2FAActivo();

      // Cambiar a estado de éxito
      setStep("success");
      onSuccess?.(res);
    } catch (err) {
      console.error("Error al activar 2FA:", err);
      setSubmitError(
        err.message ||
          "Código de verificación inválido o expirado. Verifique que la hora de su dispositivo esté sincronizada e intente de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preparar src de la imagen QR (soporta formato data URI o Base64 plano)
  const qrImageSrc = qrData?.qr
    ? qrData.qr.startsWith("data:") || qrData.qr.startsWith("http")
      ? qrData.qr
      : `data:image/png;base64,${qrData.qr}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose?.();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#081D30] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600/30 p-2 text-blue-400 border border-blue-500/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2
                id="security-modal-title"
                className="text-sm sm:text-base font-bold tracking-tight text-white"
              >
                Seguridad de la Cuenta
              </h2>
              <p className="text-[11px] text-slate-300">
                Autenticación en Dos Pasos (2FA · TOTP)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido según el estado */}
        <div className="p-6">
          {/* ========================================================= */}
          {/* ESTADO 1: INICIAL (SIN 2FA ACTIVO)                        */}
          {/* ========================================================= */}
          {step === "initial" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                <ShieldAlert size={28} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Estado Actual:
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    2FA Desactivado
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Protección en Dos Pasos (2FA)
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Agregue una capa de seguridad criptográfica a su cuenta. Al
                  iniciar sesión, el sistema solicitará su contraseña y un
                  código temporal generado por su aplicación autenticadora.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <Smartphone size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-800 font-semibold">
                      Aplicaciones compatibles
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      Google Authenticator, Microsoft Authenticator, Authy o
                      1Password.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Key size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-800 font-semibold">
                      Estándar Criptográfico
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      Algoritmo TOTP de 6 dígitos bajo estándar RFC 6238.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartSetup}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
                >
                  <QrCode size={18} />
                  <span>Activar Protección en Dos Pasos (2FA)</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ESTADO: YA ACTIVO (VISTA INFORMATIVA / GESTIÓN)             */}
          {/* ========================================================= */}
          {step === "active" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ShieldCheck size={32} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Estado Actual:
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    2FA Activo
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Su cuenta está protegida
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  La autenticación de dos factores está operando correctamente.
                  Cada inicio de sesión requerirá validación de su código TOTP.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-slate-700 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Protección TOTP consolidada</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  Si cambió de teléfono o perdió el acceso a su app
                  autenticadora, puede volver a sincronizar un nuevo código QR.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleStartSetup}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition cursor-pointer"
                >
                  <RefreshCw size={15} />
                  <span>Volver a Sincronizar / Nuevo QR</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ESTADO 2: CARGANDO QR / VISUALIZACIÓN QR & SECRETO         */}
          {/* ========================================================= */}
          {step === "qr" && (
            <div className="space-y-4">
              {isLoadingQR ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                  <Loader2 size={36} className="animate-spin text-blue-600" />
                  <p className="text-sm font-semibold text-slate-800">
                    Generando credencial TOTP...
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Estamos configurando su semilla criptográfica segura y
                    generando el código QR.
                  </p>
                </div>
              ) : qrError ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Error al generar código 2FA
                    </h3>
                    <p className="mt-1 text-xs text-red-600">{qrError}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(user?.dos_pasos_activo ? "active" : "initial")}
                      className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleStartSetup}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pasos */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
                    <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px]">
                        1
                      </span>
                      Escanear Código QR
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[11px]">
                        2
                      </span>
                      Confirmar Código
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      Escanee el código con su aplicación
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      Abra Google Authenticator, Microsoft Authenticator o su
                      app preferida y enfoque este código:
                    </p>
                  </div>

                  {/* Imagen del código QR */}
                  <div className="flex justify-center">
                    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-xs">
                      {qrImageSrc ? (
                        <img
                          src={qrImageSrc}
                          alt="Código QR para configuración 2FA"
                          className="h-44 w-44 sm:h-52 sm:w-52 object-contain"
                        />
                      ) : (
                        <div className="flex h-44 w-44 items-center justify-center text-xs text-slate-400">
                          Código QR no disponible
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clave Manual Base32 */}
                  {qrData?.secreto && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Clave de configuración manual (Base32):</span>
                        {copied && (
                          <span className="text-emerald-600 font-bold">
                            ¡Clave copiada!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-slate-200 px-3 py-1.5">
                        <code className="font-mono text-xs font-bold text-slate-800 break-all select-all tracking-wider">
                          {qrData.secreto}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition shrink-0"
                          title="Copiar clave manual"
                          aria-label="Copiar clave manual"
                        >
                          {copied ? (
                            <Check size={16} className="text-emerald-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botones de navegación */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setStep(user?.dos_pasos_activo ? "active" : "initial")
                      }
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("confirm")}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
                    >
                      <span>Ya lo escaneé · Continuar</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ESTADO 3: CONFIRMACIÓN DEL PRIMER CÓDIGO TOTP (6 DÍGITOS)  */}
          {/* ========================================================= */}
          {step === "confirm" && (
            <form onSubmit={handleActivate} className="space-y-4">
              {/* Pasos */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setStep("qr")}
                  className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a ver QR</span>
                </button>
                <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px]">
                    2
                  </span>
                  Confirmar Código
                </span>
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Ingrese el código de 6 dígitos
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Introduzca el código numérico temporal que muestra su
                  aplicación autenticadora para verificar la sincronización:
                </p>
              </div>

              {/* Input numérico de 6 dígitos */}
              <div className="py-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]*"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  autoFocus
                  disabled={isSubmitting}
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3.5 text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-hidden disabled:opacity-60"
                />
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                  {code.length}/6 dígitos ingresados
                </p>
              </div>

              {/* Mensaje de error si la validación falla */}
              {submitError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-tight">{submitError}</span>
                </div>
              )}

              {/* Botón de Confirmación y Activación */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("qr")}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  « Ver QR
                </button>
                <button
                  type="submit"
                  disabled={code.length !== 6 || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Validando código...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirmar y Activar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* ESTADO: ÉXITO (HTTP 200 CONSOLIDADO)                      */}
          {/* ========================================================= */}
          {step === "success" && (
            <div className="space-y-5 text-center animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    2FA Activo
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ¡Protección 2FA Activada con Éxito!
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  El segundo factor de autenticación se ha consolidado en su
                  cuenta. A partir de ahora, cada inicio de sesión solicitará
                  su código TOTP de 6 dígitos.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 text-left space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-700" />
                  Configuración completada y verificada ante el servidor.
                </p>
                <p className="text-[11px] text-emerald-700/90 pl-5">
                  No elimine la cuenta en su aplicación autenticadora para
                  evitar bloqueos de acceso.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer"
                >
                  Entendido y Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Security2FAModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;
  return <Security2FAModalDialog onClose={onClose} onSuccess={onSuccess} />;
};
