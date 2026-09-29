import { useState } from "react";
import { Link } from "react-router-dom";
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
  User,
  ChevronRight,
} from "lucide-react";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUS,
  ENTITIES,
  createIncident,
  getIncidentsByCitizenDni,
} from "../services/mockData";

export const CitizenReportPage = () => {
  const [activeTab, setActiveTab] = useState("reportar"); // 'reportar' | 'historial'

  // Estados del Formulario
  const [dni, setDni] = useState("73232323"); // DNI demo predeterminado
  const [selectedCatId, setSelectedCatId] = useState("CAT-01");
  const [severity, setSeverity] = useState("Alta");
  const [description, setDescription] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [coordinates, setCoordinates] = useState({
    lat: -12.046374,
    lng: -77.042793,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Mapeo dinámico de iconos de Lucide
  const renderCategoryIcon = (iconName) => {
    switch (iconName) {
      case "Cone":
        return <Cone size={20} className="text-amber-600" />;
      case "CircleDot":
        return <CircleDot size={20} className="text-red-600" />;
      case "Droplets":
        return <Droplets size={20} className="text-blue-600" />;
      default:
        return <AlertTriangle size={20} className="text-orange-600" />;
    }
  };

  // Captura de GPS mediante API nativa
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Su navegador no soporta geolocalización satelital.");
      return;
    }
    setIsLocating(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn("Fallo GPS:", err.message);
        setCoordinates({ lat: -12.046374, lng: -77.042793 }); // Fallback Lima Centro
        setIsLocating(false);
      },
      { timeout: 8000 },
    );
  };

  // Carga simulada de fotografía
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Envío del reporte
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (dni.length !== 8 || isNaN(dni)) {
      setErrorMsg("Debe ingresar un DNI válido de 8 dígitos.");
      return;
    }

    const selectedCategory = INCIDENT_CATEGORIES.find(
      (c) => c.id === selectedCatId,
    );
    const assignedEntity =
      selectedCategory.entityId === "ENT-SEDAPAL"
        ? ENTITIES.SEDAPAL
        : ENTITIES.MML;

    try {
      setIsSubmitting(true);
      const ticket = await createIncident({
        citizenDni: dni,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        entityId: assignedEntity.id,
        entityName: assignedEntity.name,
        district: "Cercado de Lima",
        address: addressReference || "Ubicación detectada por coordenadas",
        lat: coordinates.lat,
        lng: coordinates.lng,
        severity,
        description: description || "Reporte sin descripción adicional.",
        photoUrl: photoPreview,
      });

      setSuccessTicket(ticket);
      // Reset de campos
      setDescription("");
      setAddressReference("");
      setPhotoPreview(null);
    } catch (err) {
      setErrorMsg(
        "Ocurrió un error al despachar la alerta. Intente nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const citizenIncidents = getIncidentsByCitizenDni(dni);

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-0 md:py-8 px-0 md:px-4">
      {/* Contenedor Ergonómico Mobile-First */}
      <div className="w-full max-w-md bg-white min-h-screen md:min-h-[840px] flex flex-col shadow-xl border-x border-slate-200">
        {/* Cabecera Institucional */}
        <header className="bg-[#081D30] text-white p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-md">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none tracking-tight">
                VíaAlerta
              </h1>
              <span className="text-[10px] text-slate-300 font-medium">
                Lima Metropolitana
              </span>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-3 rounded border border-slate-700 transition"
          >
            Acceso Entidades
          </Link>
        </header>

        {/* Pestañas de Navegación Ciudadana */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab("reportar")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition ${
              activeTab === "reportar"
                ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Registrar Incidente
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition ${
              activeTab === "historial"
                ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Mis Reportes ({citizenIncidents.length})
          </button>
        </div>

        {/* Contenido Principal */}
        <main className="flex-1 p-4 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === "reportar" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sección DNI */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Documento Nacional de Identidad (DNI)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    maxLength={8}
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                    placeholder="8 dígitos"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Selector de Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Tipo de Avería o Incidente
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {INCIDENT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCatId === cat.id;
                    const entity =
                      cat.entityId === "ENT-SEDAPAL" ? "Sedapal" : "MML Obras";
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`p-3 text-left rounded border flex items-center justify-between transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-white border border-slate-200">
                            {renderCategoryIcon(cat.iconName)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {cat.name}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              Destino: {entity}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Severidad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nivel de Peligrosidad Percibido
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["Baja", "Media", "Alta", "Critica"].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 text-xs font-semibold rounded border text-center transition ${
                        severity === lvl
                          ? lvl === "Critica"
                            ? "bg-red-600 text-white border-red-600"
                            : lvl === "Alta"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-blue-600 text-white border-blue-600"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Módulo de Ubicación Satelital */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase">
                    <MapPin size={16} className="text-blue-600" />
                    <span>Georreferenciación</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {isLocating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : null}
                    {isLocating ? "Detectando..." : "Actualizar GPS"}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200">
                  Lat: {coordinates.lat} | Lng: {coordinates.lng} (WGS 84)
                </div>
                <input
                  type="text"
                  value={addressReference}
                  onChange={(e) => setAddressReference(e.target.value)}
                  placeholder="Referencia de calle o avenida (ej. Cruce Av. Arequipa)"
                  className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Módulo de Evidencia Fotográfica */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Evidencia Fotográfica
                </label>
                {photoPreview ? (
                  <div className="relative rounded border border-slate-300 overflow-hidden h-36 bg-slate-900 flex items-center justify-center">
                    <img
                      src={photoPreview}
                      alt="Evidencia"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 p-4 rounded cursor-pointer bg-slate-50 transition">
                    <Camera size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">
                      Adjuntar o capturar foto
                    </span>
                    <span className="text-[10px] text-slate-400">
                      JPG o PNG (Máx. 5MB)
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

              {/* Descripción Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Detalles Adicionales
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describa el forado, profundidad o peligrosidad observada..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#081D30] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Transmitiendo al Centro Operativo...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Emitir Alerta Ciudadana
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Vista Feed: Mis Reportes */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Historial de Reportes (DNI {dni})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Actualizado en vivo
                </span>
              </div>

              {citizenIncidents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShieldAlert size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">
                    No registra incidentes vinculados a este DNI.
                  </p>
                </div>
              ) : (
                citizenIncidents.map((item) => {
                  const statusInfo =
                    INCIDENT_STATUS[item.status] || INCIDENT_STATUS.REGISTRADO;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded shadow-sm"
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
                      <p className="text-xs font-bold text-slate-800 mb-1">
                        {item.categoryName}
                      </p>
                      <p className="text-[11px] text-slate-500 mb-2 truncate">
                        {item.address}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                        <span>{item.entityName}</span>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{item.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>

        {/* Modal de Confirmación de Envío */}
        {successTicket && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-150">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Alerta Georreferenciada Registrada
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                El incidente ha sido clasificado y enrutado a la entidad
                correspondiente.
              </p>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-left text-xs space-y-1 mb-4 font-mono">
                <div>
                  <span className="text-slate-500">Folio:</span>{" "}
                  <strong className="text-slate-800">
                    {successTicket.ticketNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Entidad:</span>{" "}
                  <strong className="text-slate-800">
                    {successTicket.entityName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Severidad:</span>{" "}
                  <strong className="text-slate-800">
                    {successTicket.severity}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Estado:</span>{" "}
                  <span className="text-emerald-700 font-bold">REGISTRADO</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessTicket(null);
                  setActiveTab("historial");
                }}
                className="w-full py-2.5 bg-[#081D30] hover:bg-slate-800 text-white text-xs font-bold uppercase rounded shadow transition"
              >
                Aceptar e ir a Mis Reportes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
