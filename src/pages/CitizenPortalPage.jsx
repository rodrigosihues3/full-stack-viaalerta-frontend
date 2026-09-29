import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ShieldAlert,
  MapPin,
  Camera,
  Send,
  Clock,
  AlertTriangle,
  Cone,
  CircleDot,
  Droplets,
  CheckCircle2,
  Loader2,
  X,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Layers,
  FileText,
} from "lucide-react";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUS,
  ENTITIES,
  createIncident,
  getIncidentsByCitizenDni,
} from "../services/mockData";

export const CitizenPortalPage = () => {
  const { user, logout } = useAuth();

  // Máquina de estados de pantalla: 'home' | 'select_category' | 'confirm_report' | 'history'
  const [currentScreen, setCurrentScreen] = useState("home");

  // Estado del flujo de reporte
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [severity, setSeverity] = useState("Alta");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState({
    lat: -12.046374,
    lng: -77.042793,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);

  // Captura automática de GPS al entrar a la confirmación
  useEffect(() => {
    if (currentScreen === "confirm_report") {
      if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoordinates({
              lat: parseFloat(pos.coords.latitude.toFixed(6)),
              lng: parseFloat(pos.coords.longitude.toFixed(6)),
            });
            setIsLocating(false);
          },
          () => {
            // Fallback: Centro de Lima
            setCoordinates({ lat: -12.046374, lng: -77.042793 });
            setIsLocating(false);
          },
          { timeout: 7000 },
        );
      }
    }
  }, [currentScreen]);

  const renderIcon = (iconName) => {
    switch (iconName) {
      case "Cone":
        return <Cone size={22} className="text-amber-500" />;
      case "CircleDot":
        return <CircleDot size={22} className="text-red-500" />;
      case "Droplets":
        return <Droplets size={22} className="text-blue-500" />;
      default:
        return <AlertTriangle size={22} className="text-orange-500" />;
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSeverity(cat.defaultSeverity || "Alta");
    setCurrentScreen("confirm_report");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;

    const assignedEntity =
      selectedCategory.entityId === "ENT-SEDAPAL"
        ? ENTITIES.SEDAPAL
        : ENTITIES.MML;

    try {
      setIsSubmitting(true);
      const ticket = await createIncident({
        citizenDni: user.dni,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        entityId: assignedEntity.id,
        entityName: assignedEntity.name,
        district: "Cercado de Lima",
        address: "Coordenadas fijadas en vía pública",
        lat: coordinates.lat,
        lng: coordinates.lng,
        severity,
        description:
          description.trim() ||
          "Reporte generado sin comentarios complementarios.",
        photoUrl: photoPreview,
      });

      setSuccessTicket(ticket);
      // Limpiar formulario
      setSelectedCategory(null);
      setDescription("");
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const citizenIncidents = getIncidentsByCitizenDni(user?.dni || "");

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center py-0 md:py-6 px-0 md:px-4">
      {/* Contenedor Estilo Móvil */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen md:min-h-[820px] flex flex-col shadow-2xl relative">
        {/* Cabecera Superior */}
        <header className="bg-[#081D30] text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">VíaAlerta</h1>
              <p className="text-[10px] text-slate-300">Canal Ciudadano</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold block leading-none">
                {user?.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                DNI: {user?.dni}
              </span>
            </div>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* ========================================================
            VISTA 1: HOME (Panel Central Ciudadano)
        ======================================================== */}
        {currentScreen === "home" && (
          <main className="flex-1 p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  ¿Detectaste un incidente?
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reporta fallas viales o roturas de red para canalización
                  oficial.
                </p>
              </div>

              {/* Botón Principal de Gran Jerarquía */}
              <button
                onClick={() => setCurrentScreen("select_category")}
                className="w-full bg-[#081D30] hover:bg-slate-800 text-white rounded-xl p-6 shadow-lg border border-slate-700 flex flex-col items-center justify-center text-center group transition active:scale-[0.99]"
              >
                <div className="p-3 bg-red-600/20 text-red-500 rounded-full mb-3 group-hover:scale-105 transition">
                  <AlertTriangle size={36} />
                </div>
                <span className="text-base font-bold tracking-wide uppercase">
                  Reportar Incidente
                </span>
                <span className="text-xs text-slate-300 mt-1">
                  Presione para categorizar y enviar alerta
                </span>
              </button>

              {/* Accesos Rápidos */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setCurrentScreen("history")}
                  className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-400 text-left transition flex flex-col justify-between"
                >
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md w-fit mb-2">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Mis Reportes
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {citizenIncidents.length} registrados
                    </span>
                  </div>
                </button>

                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs text-left flex flex-col justify-between opacity-80">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md w-fit mb-2">
                    <Layers size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Monitor Vial
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Lima Metropolitana
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800">
              Su reporte se conecta de forma directa con los cuadrantes
              operativos de la MML y Sedapal.
            </div>
          </main>
        )}

        {/* ========================================================
            VISTA 2: SELECCIÓN DE CATEGORÍA
        ======================================================== */}
        {currentScreen === "select_category" && (
          <main className="flex-1 p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setCurrentScreen("home")}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-full transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Seleccione el Tipo de Daño
              </h2>
            </div>

            <div className="space-y-2.5 flex-1">
              {INCIDENT_CATEGORIES.map((cat) => {
                const entityName =
                  cat.entityId === "ENT-SEDAPAL"
                    ? "Sedapal"
                    : "Municipalidad de Lima";
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full p-4 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-[#081D30] hover:shadow-sm text-left flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md group-hover:bg-blue-50 transition">
                        {renderIcon(cat.iconName)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {cat.name}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Destino: {entityName}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-slate-300 group-hover:text-slate-600"
                    />
                  </button>
                );
              })}
            </div>
          </main>
        )}

        {/* ========================================================
            VISTA 3: CONFIRMACIÓN, GPS Y DETALLES OPCIONALES
        ======================================================== */}
        {currentScreen === "confirm_report" && selectedCategory && (
          <main className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setCurrentScreen("select_category")}
                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-full transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Confirmar Alerta
                  </h2>
                  <span className="text-[10px] text-slate-500">
                    {selectedCategory.name}
                  </span>
                </div>
              </div>

              {/* Ficha Resumen de Destino */}
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Entidad receptora:</span>
                  <strong className="text-slate-700">
                    {selectedCategory.entityId === "ENT-SEDAPAL"
                      ? "Sedapal"
                      : "MML Obras Públicas"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prioridad asignada:</span>
                  <span className="font-bold text-amber-600">{severity}</span>
                </div>
              </div>

              {/* Módulo de Georreferenciación Automática */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <MapPin size={16} className="text-blue-600" />
                    <span>Ubicación Satelital Automática</span>
                  </div>
                  {isLocating ? (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />{" "}
                      Obteniendo...
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Fijada
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200">
                  Lat: {coordinates.lat} | Lng: {coordinates.lng} (WGS 84)
                </div>
              </div>

              {/* Evidencia Fotográfica (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fotografía (Opcional)
                </label>
                {photoPreview ? (
                  <div className="relative rounded-lg border border-slate-300 overflow-hidden h-36 bg-slate-900 flex items-center justify-center">
                    <img
                      src={photoPreview}
                      alt="Evidencia"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-lg cursor-pointer bg-white transition">
                    <Camera size={20} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      Capturar o seleccionar foto
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Comentarios (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Descripción o Referencia (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre carril obstruido, profundidad..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#081D30]"
                />
              </div>

              {/* Botón de Despacho */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#081D30] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Transmitiendo al Centro Operativo...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Despachar Alerta Inmediata
                  </>
                )}
              </button>
            </form>
          </main>
        )}

        {/* ========================================================
            VISTA 4: HISTORIAL (Mis Reportes)
        ======================================================== */}
        {currentScreen === "history" && (
          <main className="flex-1 p-5 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentScreen("home")}
                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-full transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Mis Reportes
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                DNI {user?.dni}
              </span>
            </div>

            <div className="space-y-3">
              {citizenIncidents.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">
                    No tiene incidentes registrados en su historial.
                  </p>
                </div>
              ) : (
                citizenIncidents.map((item) => {
                  const statusInfo =
                    INCIDENT_STATUS[item.status] || INCIDENT_STATUS.REGISTRADO;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {item.ticketNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">
                        {item.categoryName}
                      </p>
                      <p className="text-[10px] text-slate-400 mb-2">
                        {item.address}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                        <span>{item.entityName}</span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock size={12} />
                          <span>{item.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        )}

        {/* Modal Emergente de Registro Exitoso */}
        {successTicket && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-150">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase">
                Alerta Transmitida con Éxito
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                El incidente ha sido ingresado al sistema de fiscalización
                metropolitana.
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-left text-xs space-y-1 mb-4 font-mono">
                <div>
                  <span className="text-slate-400">Folio:</span>{" "}
                  <strong className="text-slate-800">
                    {successTicket.ticketNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Entidad:</span>{" "}
                  <strong className="text-slate-800">
                    {successTicket.entityName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Estado:</span>{" "}
                  <span className="text-emerald-600 font-bold">REGISTRADO</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessTicket(null);
                  setCurrentScreen("history");
                }}
                className="w-full py-2.5 bg-[#081D30] hover:bg-slate-800 text-white text-xs font-bold uppercase rounded-lg shadow transition"
              >
                Ver en Mis Reportes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
