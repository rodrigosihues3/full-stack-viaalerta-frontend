import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Cone,
  Droplets,
  FileText,
  HelpCircle,
  Image,
  Layers,
  Loader2,
  LogOut,
  Map,
  MapPin,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUS,
  ENTITIES,
  createIncident,
  getIncidents,
  getIncidentsByCitizenDni,
} from "../services/mockData";

const iconByName = { Cone, CircleDot, Droplets, HelpCircle, AlertTriangle };
const categoryIconStyles = {
  "CAT-01": "border-amber-200 bg-amber-50 text-amber-600",
  "CAT-02": "border-orange-200 bg-orange-50 text-orange-600",
  "CAT-03": "border-red-200 bg-red-50 text-red-600",
  "CAT-04": "border-blue-200 bg-blue-50 text-blue-600",
  "CAT-05": "border-slate-300 bg-slate-100 text-slate-600",
};

export const CitizenPortalPage = () => {
  const { user, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState("home");
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
  const [showTransmitConfirm, setShowTransmitConfirm] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);

  useEffect(() => {
    if (currentScreen !== "confirm_report" || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setIsLocating(false);
      },
      () => {
        setCoordinates({ lat: -12.046374, lng: -77.042793 });
        setIsLocating(false);
      },
      { timeout: 7000 },
    );
  }, [currentScreen]);

  const citizenIncidents = getIncidentsByCitizenDni(user?.dni || "");
  const activeIncidents = getIncidents().filter(
    (incident) =>
      incident.status !== "RESUELTO" && incident.status !== "DESESTIMADO",
  );
  const assignedEntity =
    selectedCategory?.entityId === "ENT-SEDAPAL"
      ? ENTITIES.SEDAPAL
      : ENTITIES.MML;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Ciudadano")}&background=081D30&color=fff&size=64`;

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSeverity(category.defaultSeverity || "Media");
    setCurrentScreen("confirm_report");
  };
  const uploadPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };
  const submitReport = async () => {
    if (!selectedCategory) return;
    try {
      setIsSubmitting(true);
      const ticket = await createIncident({
        citizenDni: user.dni,
        categoryId: selectedCategory.id,
        district: "Cercado de Lima",
        address: "Coordenadas fijadas en via publica",
        lat: coordinates.lat,
        lng: coordinates.lng,
        severity,
        description:
          description.trim() ||
          "Reporte generado sin comentarios complementarios.",
        photoUrl: photoPreview,
      });
      setSuccessTicket(ticket);
      setShowTransmitConfirm(false);
      setSelectedCategory(null);
      setDescription("");
      setPhotoPreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };
  const BackButton = ({ to = "home" }) => (
    <button
      type="button"
      onClick={() => setCurrentScreen(to)}
      className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-200"
      aria-label="Volver"
    >
      <ArrowLeft size={18} />
    </button>
  );

  return (
    <div className="flex min-h-screen justify-center bg-slate-900 px-0 py-0 md:px-4 md:py-6">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-2xl md:min-h-[820px]">
        <header className="flex items-center justify-between bg-[#081D30] p-4 text-white shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded bg-blue-600 p-1.5">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold">ViaAlerta</h1>
              <p className="text-[10px] text-slate-300">Canal Ciudadano</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentScreen("profile")}
            className="flex items-center gap-2 rounded-lg p-1 text-right transition hover:bg-slate-800"
            aria-label="Abrir mi perfil"
          >
            <div>
              <p className="max-w-28 truncate text-xs font-bold">
                {user?.name || "Ciudadano"}
              </p>
              <p className="text-[10px] text-slate-300">Mi perfil</p>
            </div>
            <img
              src={avatarUrl}
              alt="Avatar del ciudadano"
              className="h-9 w-9 rounded-full border border-slate-300"
            />
          </button>
        </header>

        {currentScreen === "home" && (
          <main className="flex flex-1 flex-col justify-between p-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  ¿Detectaste un incidente?
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Reporta fallas viales o roturas de red para canalizacion
                  oficial.
                </p>
              </div>
              <button
                onClick={() => setCurrentScreen("select_category")}
                className="flex w-full flex-col items-center justify-center rounded-xl bg-red-600 p-6 text-center text-white shadow-md transition hover:bg-red-700 active:scale-95"
              >
                <AlertTriangle size={34} />
                <span className="mt-3 text-base font-bold uppercase tracking-wide">
                  Reportar Incidente
                </span>
                <span className="mt-1 text-xs text-red-100">
                  Categorice y envie su alerta
                </span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentScreen("history")}
                  className="flex min-h-36 flex-col justify-between rounded-lg border border-slate-300 bg-white p-4 text-left shadow-sm transition hover:border-slate-400"
                >
                  <div className="w-fit rounded-md bg-blue-50 p-2 text-blue-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Mis Reportes
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {citizenIncidents.length} registrados
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setCurrentScreen("monitor")}
                  className="flex min-h-36 flex-col justify-between rounded-lg border border-slate-300 bg-white p-4 text-left shadow-sm transition hover:border-slate-400"
                >
                  <div className="w-fit rounded-md bg-emerald-50 p-2 text-emerald-600">
                    <Layers size={20} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Monitor Vial
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Lima Metropolitana
                    </span>
                  </div>
                </button>
              </div>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-800">
              Su reporte se envía directamente a las entidades operativas
              de las Municipalidades de Lima y Sedapal.
            </div>
          </main>
        )}

        {currentScreen === "profile" && (
          <main className="flex-1 p-5">
            <div className="mb-5 flex items-center gap-2">
              <BackButton />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Mi Perfil
              </h2>
            </div>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt="Avatar del ciudadano"
                  className="h-14 w-14 rounded-full"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {user?.name}
                  </p>
                  <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Ciudadano Registrado
                  </span>
                </div>
              </div>
              <dl className="space-y-3 text-xs">
                <div className="border-t border-slate-100 pt-3">
                  <dt className="text-slate-400">Nombres completos</dt>
                  <dd className="mt-0.5 font-bold text-slate-700">
                    {user?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">DNI</dt>
                  <dd className="mt-0.5 font-mono font-bold text-slate-700">
                    {user?.dni}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Correo</dt>
                  <dd className="mt-0.5 break-all font-bold text-slate-700">
                    {user?.email}
                  </dd>
                </div>
              </dl>
              <button
                onClick={logout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-xs font-bold uppercase text-white shadow transition hover:bg-red-700"
              >
                <LogOut size={16} />
                Cerrar Sesion
              </button>
            </section>
          </main>
        )}

        {currentScreen === "select_category" && (
          <main className="flex-1 p-5">
            <div className="mb-4 flex items-center gap-2">
              <BackButton />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Seleccione el tipo de daño
              </h2>
            </div>
            <div className="space-y-2.5">
              {INCIDENT_CATEGORIES.map((category) => {
                const Icon = iconByName[category.iconName] || AlertTriangle;
                const entityName =
                  category.entityId === "ENT-SEDAPAL-NORTE"
                    ? "Sedapal"
                    : "Municipalidad de Lima";
                return (
                  <button
                    key={category.id}
                    onClick={() => selectCategory(category)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white p-4 text-left shadow-sm transition hover:border-[#081D30]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-md border p-2.5 ${categoryIconStyles[category.id] || categoryIconStyles["CAT-05"]}`}
                      >
                        <Icon size={21} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {category.name}
                        </p>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          Destino: {entityName}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                );
              })}
            </div>
          </main>
        )}

        {currentScreen === "confirm_report" && selectedCategory && (
          <main className="flex-1 overflow-y-auto p-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setShowTransmitConfirm(true);
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <BackButton to="select_category" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Confirmar reporte
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Revise los datos antes de transmitir.
                  </p>
                </div>
              </div>
              <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Resumen
                </p>
                <div className="text-xs">
                  <p className="font-bold text-slate-800">
                    {selectedCategory.name}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Entidad receptora:{" "}
                    <strong className="text-slate-700">
                      {assignedEntity.name}
                    </strong>
                  </p>
                  <p className="mt-1 text-slate-500">
                    Nivel de severidad:{" "}
                    <strong className="text-amber-700">{severity}</strong>
                  </p>
                </div>
              </section>
              <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Ubicacion
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {isLocating ? "Capturando GPS" : "GPS activo"}
                  </span>
                </div>
                <div className="flex gap-2 text-xs font-bold text-slate-700">
                  <MapPin size={16} className="text-blue-600" />
                  Coordenadas capturadas
                </div>
                <p className="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-600">
                  Lat: {coordinates.lat} | Lng: {coordinates.lng}
                </p>
              </section>
              <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Evidencia fotografica opcional
                </p>
                {photoPreview ? (
                  <div className="relative h-36 overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
                    <img
                      src={photoPreview}
                      alt="Vista previa de evidencia"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-center text-[11px] font-bold text-slate-700 transition hover:border-[#081D30]">
                      <Camera size={20} className="text-[#081D30]" />
                      Tomar Foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={uploadPhoto}
                        className="hidden"
                      />
                    </label>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-center text-[11px] font-bold text-slate-700 transition hover:border-[#081D30]">
                      <Image size={20} className="text-[#081D30]" />
                      Subir de Galeria
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </section>
              <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Descripcion
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Observaciones opcionales sobre el incidente"
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#081D30]"
                />
              </section>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#081D30] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
              >
                Enviar Reporte
              </button>
            </form>
          </main>
        )}

        {currentScreen === "monitor" && (
          <main className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex items-center gap-2">
              <BackButton />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Monitor Vial
              </h2>
            </div>
            <section className="mb-4 overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-sm">
              <div
                className="relative h-44 bg-slate-200"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(8,29,48,.16) 1px, transparent 1px), linear-gradient(rgba(8,29,48,.16) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              >
                <Map
                  size={44}
                  className="absolute left-5 top-5 text-[#081D30]/40"
                />
                <MapPin
                  size={30}
                  className="absolute bottom-8 right-16 text-red-600"
                />
                <span className="absolute bottom-3 left-3 font-mono text-[10px] text-slate-600">
                  -12.046374, -77.042793
                </span>
              </div>
            </section>
            <h3 className="mb-2 text-xs font-bold uppercase text-slate-700">
              Incidentes activos en Lima Metropolitana
            </h3>
            <div className="space-y-2.5">
              {activeIncidents.map((incident, index) => {
                const status =
                  INCIDENT_STATUS[incident.status] ||
                  INCIDENT_STATUS.REGISTRADO;
                return (
                  <article
                    key={incident.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800">
                        {incident.categoryName}
                      </p>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${status.badge}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{incident.district}</span>
                      <span>a {(1.2 + index * 0.7).toFixed(1)} km</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </main>
        )}

        {currentScreen === "history" && (
          <main className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BackButton />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                  Mis Reportes
                </h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {citizenIncidents.length} reportes
              </span>
            </div>
            <div className="space-y-3">
              {citizenIncidents.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">
                    No tiene incidentes registrados en su historial.
                  </p>
                </div>
              ) : (
                citizenIncidents.map((item) => {
                  const status =
                    INCIDENT_STATUS[item.status] || INCIDENT_STATUS.REGISTRADO;
                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          {item.ticketNumber}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${status.badge}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {item.categoryName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {item.address}
                      </p>
                      <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                        <span>{item.entityName}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {item.createdAt}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </main>
        )}

        {showTransmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-slate-800">
                Confirmar envio
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Desea transmitir este reporte a {assignedEntity.name}?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransmitConfirm(false)}
                  className="rounded-lg border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
                >
                  Revisar
                </button>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={isSubmitting}
                  className="flex items-center justify-center rounded-lg bg-[#081D30] py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Confirmar Envio"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {successTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-sm font-bold uppercase text-slate-800">
                Reporte transmitido
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                El incidente fue ingresado al sistema de fiscalizacion.
              </p>
              <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left font-mono text-xs">
                <p>
                  Folio: <strong>{successTicket.ticketNumber}</strong>
                </p>
                <p className="mt-1">
                  Entidad: <strong>{successTicket.entityName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccessTicket(null);
                  setCurrentScreen("history");
                }}
                className="w-full rounded-lg bg-[#081D30] py-2.5 text-xs font-bold uppercase text-white"
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
