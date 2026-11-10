import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { INCIDENT_STATUS } from "../services/mockData";
import {
  getIncidentes,
  updateIncidenteEstado,
  normalizeIncidente,
} from "../services/incidentService";
import { getSocket } from "../services/socketService";
import { Security2FAModal } from "../components/Security2FAModal";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Layers,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Cpu,
  AlertTriangle,
  Loader2,
  Check,
  ArrowRight,
  RefreshCw,
  Table,
  LayoutGrid,
} from "lucide-react";

/**
 * Formateador de fecha en estándar institucional peruano (es-PE)
 */
const formatearFecha = (isoString) => {
  if (!isoString) return "Fecha no registrada";
  const fecha = new Date(isoString);
  if (isNaN(fecha.getTime())) return isoString;
  return fecha.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Obtención de iniciales para avatar
 */
const obtenerIniciales = (nombre, fallback = "OP") => {
  if (!nombre) return fallback;
  const partes = String(nombre).trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

/**
 * Fases secuenciales del pipeline de trazabilidad
 */
const PIPELINE_STAGES = [
  { key: "REGISTRADO", label: "Registrado" },
  { key: "EVALUACION", label: "Evaluación" },
  { key: "REPARACION", label: "Reparación" },
  { key: "RESUELTO", label: "Resuelto" },
];

/**
 * Mini Mapa Leaflet para evidencias geográficas de expedientes
 */
const MiniIncidentMap = ({ lat, lng }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const latitude = Number(lat) || -12.046374;
    const longitude = Number(lng) || -77.042793;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: "viaalerta-mini-marker",
      html: `
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #ef4444;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.35), 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 6px; height: 6px; border-radius: 9999px; background: #ffffff;"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
    mapRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export const EntityDashboardPage = () => {
  const { user, logout } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [vistaActual, setVistaActual] = useState("cards");
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [actionState, setActionState] = useState({
    mode: "IDLE",
    targetStatus: null,
    reason: "Reporte duplicado o ya atendido",
  });

  // Cerrar popover de perfil al interactuar fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carga inicial vía API y suscripción en tiempo real vía Socket.IO
  useEffect(() => {
    let isMounted = true;
    const fetchIncidents = async () => {
      try {
        const data = await getIncidentes();
        if (isMounted) setIncidents(data);
      } catch (err) {
        console.error("Error al cargar incidentes de la entidad:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchIncidents();

    const socket = getSocket();
    const handleNuevoIncidente = (nuevo) => {
      const normalized = normalizeIncidente(nuevo);
      setIncidents((prev) => {
        if (prev.some((i) => i.id === normalized.id)) return prev;
        return [normalized, ...prev];
      });
    };

    const handleEstadoActualizado = (payload) => {
      const id = payload?.incidenteId || payload?.id;
      const nuevoEstado = (
        payload?.nuevoEstado ||
        payload?.estado ||
        ""
      ).toUpperCase();
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id || item._id === id
            ? { ...item, status: nuevoEstado, estado: nuevoEstado }
            : item,
        ),
      );
      setSelectedIncident((curr) => {
        if (curr && (curr.id === id || curr._id === id)) {
          return { ...curr, status: nuevoEstado, estado: nuevoEstado };
        }
        return curr;
      });
    };

    const handleConfirmado = (payload) => {
      const id = payload?.incidenteId || payload?.id;
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id || item._id === id
            ? {
                ...item,
                confirmaciones_count:
                  payload?.nuevoContador ?? (item.confirmaciones_count + 1),
              }
            : item,
        ),
      );
    };

    socket.on("incidente:creado", handleNuevoIncidente);
    socket.on("incidente:estado_actualizado", handleEstadoActualizado);
    socket.on("incidente:confirmado", handleConfirmado);

    return () => {
      isMounted = false;
      socket.off("incidente:creado", handleNuevoIncidente);
      socket.off("incidente:estado_actualizado", handleEstadoActualizado);
      socket.off("incidente:confirmado", handleConfirmado);
    };
  }, []);

  // Recarga manual de incidentes desde el backend
  const handleRefrescarIncidentes = async () => {
    setIsLoading(true);
    try {
      const data = await getIncidentes();
      setIncidents(data);
    } catch (err) {
      console.error("Error al refrescar incidentes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Recalcular métricas operativas
  const totalCount = incidents.length;
  const evaluacionCount = incidents.filter(
    (i) => i.status === "EVALUACION",
  ).length;
  const reparacionCount = incidents.filter(
    (i) => i.status === "REPARACION",
  ).length;
  const resueltosCount = incidents.filter(
    (i) => i.status === "RESUELTO",
  ).length;

  // Filtrado compuesto (estado + término de búsqueda)
  const filteredIncidents = incidents.filter((item) => {
    const matchesStatus =
      filterStatus === "TODOS" || item.status === filterStatus;
    const matchesSearch =
      (item.ticketNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.district || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categoryName || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const pageSize = 6;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredIncidents.length / pageSize),
  );
  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const showingFrom =
    filteredIncidents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, filteredIncidents.length);

  // Manejo del cambio de estado conectado al Backend REST
  const handleStatusChange = async (newStatus) => {
    if (!selectedIncident) return;
    try {
      const updated = await updateIncidenteEstado(selectedIncident.id, {
        nuevoEstado: newStatus,
        motivoDesestimacion:
          newStatus === "DESESTIMADO" ? actionState.reason : null,
        notaObservacion: "Actualizado desde panel de control institucional",
      });

      setIncidents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedIncident(updated);
      setActionState({
        mode: "IDLE",
        targetStatus: null,
        reason: "Reporte duplicado o ya atendido",
      });
    } catch (err) {
      console.error("Error al actualizar estado del incidente:", err);
      alert(err.message || "Error al actualizar estado en el servidor.");
    }
  };

  const resetActionState = () =>
    setActionState({
      mode: "IDLE",
      targetStatus: null,
      reason: "Reporte duplicado o ya atendido",
    });

  const closeInspection = () => {
    setSelectedIncident(null);
    resetActionState();
  };

  // Metadatos para el pipeline de estado en el modal
  const currentStatus = (
    selectedIncident?.status ||
    selectedIncident?.estado ||
    "REGISTRADO"
  ).toUpperCase();
  const currentStageIndex = PIPELINE_STAGES.findIndex(
    (stage) => stage.key === currentStatus,
  );
  const isResolved = currentStatus === "RESUELTO";
  const isDismissed = currentStatus === "DESESTIMADO";
  const canAdvance =
    !isResolved &&
    !isDismissed &&
    currentStageIndex >= 0 &&
    currentStageIndex < PIPELINE_STAGES.length - 1;
  const nextStage = canAdvance ? PIPELINE_STAGES[currentStageIndex + 1] : null;
  const photoUrl = selectedIncident?.photoUrl || selectedIncident?.foto_url;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Barra de Navegación Institucional */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#081D30] text-white">
        <div className="mx-auto flex max-w-7xl w-full items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ShieldAlert size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">
                  VíaAlerta Operaciones
                </h1>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {user?.entityName || user?.entidad_nombre || "Panel de Operaciones"}
              </p>
            </div>
          </div>

          {/* Cluster de Perfil con Menú Desplegable (Popover) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-800/80 transition cursor-pointer focus:outline-hidden"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {/* Extremo derecho: Subtítulo con sede técnica / correo del operador */}
              <div className="hidden sm:block text-right text-xs leading-tight">
                <span className="block font-bold text-slate-100">
                  {user?.name || "Operador de Entidad"}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  {user?.jurisdiction
                    ? `Sede técnica · ${user.jurisdiction}`
                    : user?.email || "operaciones@entidad.gob.pe"}
                </span>
              </div>

              {/* Avatar circular con iniciales y borde semafórico */}
              <div
                title={
                  user?.dos_pasos_activo
                    ? "2FA Activo: cuenta protegida"
                    : "2FA Inactivo"
                }
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-xs bg-slate-800 text-white transition-colors ${
                  user?.dos_pasos_activo
                    ? "border-2 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "border-2 border-slate-500"
                }`}
              >
                <span>
                  {obtenerIniciales(user?.name || user?.entityName, "OP")}
                </span>
                {user?.dos_pasos_activo ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-700 text-white border-2 border-[#081D30]"
                    title="2FA Activo"
                  >
                    <Check size={8} strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-slate-500 border-2 border-[#081D30]"
                    title="2FA Inactivo"
                  />
                )}
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Menú flotante (Popover) */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl z-50 text-slate-800 overflow-hidden">
                {/* Cabecera con datos de la entidad asignada y rol */}
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.entityName || user?.entidad_nombre || "Entidad Asignada"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    {user?.email || "operador@entidad.gob.pe"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      {user?.rol || user?.role || "OPERADOR_ENTIDAD"}
                    </span>
                    {user?.jurisdiction && (
                      <span className="text-[10px] text-slate-500 truncate">
                        {user.jurisdiction}
                      </span>
                    )}
                  </div>
                </div>

                {/* Opciones */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSecurityModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        size={16}
                        className={
                          user?.dos_pasos_activo
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }
                      />
                      <span>Seguridad / 2FA</span>
                    </div>
                    {user?.dos_pasos_activo ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Inactivo
                      </span>
                    )}
                  </button>

                  <hr className="my-1 border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Fila de Tarjetas KPI */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Asignados
              </span>
              <Layers size={18} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
            <span className="text-[10px] text-slate-400">
              Total en jurisdicción
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                En Evaluación
              </span>
              <AlertCircle size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {evaluacionCount}
            </p>
            <span className="text-[10px] text-slate-400">
              Pendientes de verificación
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                En Reparación
              </span>
              <Clock size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {reparacionCount}
            </p>
            <span className="text-[10px] text-slate-400">
              Trabajos en ejecución
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Resueltos
              </span>
              <CheckCircle2 size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {resueltosCount}
            </p>
            <span className="text-[10px] text-slate-400">
              Atenciones concluidas
            </span>
          </div>
        </section>

        {/* Panel Central: Bandeja de Incidentes */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {/* Barra de Filtros, Búsqueda, Refresh y Conmutador de Vista */}
          <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
                <Filter size={14} /> Filtro:
              </span>
              {[
                "TODOS",
                "REGISTRADO",
                "EVALUACION",
                "REPARACION",
                "RESUELTO",
              ].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setFilterStatus(st);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded transition whitespace-nowrap cursor-pointer ${
                    filterStatus === st
                      ? "bg-[#081D30] text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st === "TODOS" ? "Todos" : INCIDENT_STATUS[st]?.label || st}
                </button>
              ))}
            </div>

            {/* Barra de Búsqueda + Refresh + Selector Dual Cards/Tabla */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search
                  size={16}
                  className="absolute inset-y-0 left-3 my-auto text-slate-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar ticket, distrito o avería..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#081D30]"
                />
              </div>

              {/* Botón de Recarga Manual */}
              <button
                type="button"
                onClick={handleRefrescarIncidentes}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                title="Sincronizar incidentes"
              >
                <RefreshCw
                  size={14}
                  className={
                    isLoading ? "animate-spin text-blue-600" : "text-slate-500"
                  }
                />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* Selector de Vista Dual (Cards / Tabla) */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setVistaActual("cards")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    vistaActual === "cards"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVistaActual("tabla")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    vistaActual === "tabla"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Table size={14} />
                  <span className="hidden sm:inline">Tabla</span>
                </button>
              </div>
            </div>
          </div>

          {/* Vista Dual: Tabla vs Cards */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Loader2
                size={24}
                className="mx-auto mb-2 animate-spin text-[#081D30]"
              />
              Conectando con el servidor y sincronizando incidentes...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-40" />
              No se encontraron incidentes con los criterios seleccionados.
            </div>
          ) : vistaActual === "tabla" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Categoría / Tipo</th>
                    <th className="py-3 px-4">Ubicación / Distrito</th>
                    <th className="py-3 px-4 text-center">Severidad</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Fecha</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedIncidents.map((inc) => {
                    const statusInfo =
                      INCIDENT_STATUS[inc.status] || INCIDENT_STATUS.REGISTRADO;
                    const isSelected = selectedIncident?.id === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        className={`hover:bg-blue-50/40 transition cursor-pointer ${
                          isSelected ? "bg-blue-50/70" : ""
                        }`}
                        onClick={() => setSelectedIncident(inc)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {inc.ticketNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {inc.categoryName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700 block">
                            {inc.district}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block max-w-xs">
                            {inc.address}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.severity === "Critica"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : inc.severity === "Alta"
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.badge}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {formatearFecha(inc.createdAt || inc.creado_en)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIncident(inc);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded transition cursor-pointer"
                          >
                            <ArrowUpRight size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedIncidents.map((inc) => {
                const statusInfo =
                  INCIDENT_STATUS[inc.status] || INCIDENT_STATUS.REGISTRADO;
                const borderTopColor =
                  {
                    REGISTRADO: "border-t-slate-500",
                    EVALUACION: "border-t-amber-500",
                    REPARACION: "border-t-blue-600",
                    RESUELTO: "border-t-emerald-500",
                    DESESTIMADO: "border-t-red-500",
                  }[inc.status] || "border-t-slate-400";

                return (
                  <div
                    key={inc.id}
                    className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-t-4 flex flex-col justify-between ${borderTopColor}`}
                  >
                    <div className="space-y-3">
                      {/* Fila superior: Folio, Severidad y Estado */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {inc.ticketNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.severity === "Critica"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : inc.severity === "Alta"
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.badge}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Categoría y Ubicación */}
                      <div>
                        <h4
                          className="text-sm font-bold text-slate-800 line-clamp-1"
                          title={inc.categoryName}
                        >
                          {inc.categoryName}
                        </h4>
                        <p
                          className="text-xs text-slate-500 line-clamp-1 mt-0.5"
                          title={`${inc.address} · ${inc.district}`}
                        >
                          {inc.address} · {inc.district}
                        </p>
                      </div>
                    </div>

                    {/* Base del Card: Fecha y Botón de Apertura */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400">
                        {formatearFecha(inc.createdAt || inc.creado_en)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedIncident(inc)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#081D30] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs"
                      >
                        <span>Abrir Expediente</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-500">
              Mostrando {showingFrom} a {showingTo} de{" "}
              {filteredIncidents.length} incidentes
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="font-medium text-slate-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal / Panel de Inspección y Trazabilidad de Expediente */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[88vh] rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col bg-white">
            {/* Cabecera del Detalle */}
            <div className="bg-[#081D30] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold bg-blue-600 px-2 py-0.5 rounded">
                  {selectedIncident.ticketNumber}
                </span>
                <span className="text-xs text-slate-300">
                  Expediente de Fiscalización
                </span>
              </div>
              <button
                onClick={closeInspection}
                aria-label="Cerrar inspección"
                className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 overflow-y-auto">
              {/* Columna Izquierda: Datos del Expediente y Triaje IA */}
              <div className="md:col-span-7 space-y-4">
                <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-50 p-2 text-indigo-600">
                        <Cpu size={17} />
                      </span>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Evaluación automática (IA)
                      </h3>
                    </div>
                  </div>
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1.5 text-slate-700">
                    <p>
                      <span className="font-bold">Avería identificada:</span>{" "}
                      {selectedIncident.aiTriage?.detectedIssue ||
                        selectedIncident.categoryName}
                    </p>
                    <p>
                      <span className="font-bold">Severidad computada:</span>{" "}
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        {selectedIncident.aiTriage?.computedSeverity || "MEDIA"}
                      </span>
                    </p>
                    <p>
                      <span className="font-bold">Recomendación técnica:</span>{" "}
                      {selectedIncident.aiTriage?.recommendation ||
                        "Pendiente de evaluación técnica."}
                    </p>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Expediente ciudadano
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Ubicación física
                      </p>
                      <p className="font-bold text-slate-800">
                        {selectedIncident.address ||
                          selectedIncident.direccion_referencial}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {selectedIncident.district} · (Lat:{" "}
                        {selectedIncident.lat}, Lng: {selectedIncident.lng})
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Ciudadano reportante
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-800">
                        DNI:{" "}
                        {selectedIncident.citizenDni ||
                          selectedIncident.dni ||
                          "No registrado"}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {selectedIncident.usuario_email ||
                          selectedIncident.email ||
                          "Correo no registrado"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Observación complementaria
                    </p>
                    <p className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs italic text-slate-700">
                      {selectedIncident.description ||
                        selectedIncident.observaciones_ciudadano ||
                        "Sin observaciones"}
                    </p>
                  </div>
                </section>
              </div>

              {/* Columna Derecha: Foto y Mapa Desacoplados */}
              <div className="md:col-span-5 space-y-4">
                {/* Tarjeta 1 - Evidencia Fotográfica */}
                <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Evidencia Fotográfica
                  </h4>
                  {photoUrl ? (
                    <div>
                      <img
                        src={photoUrl}
                        alt="Evidencia del daño"
                        className="h-32 w-full object-cover rounded-lg border border-slate-200"
                      />
                      <a
                        href={photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        <ExternalLink size={12} />
                        <span>Ver imagen completa en nueva pestaña</span>
                      </a>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                      Sin evidencia fotográfica adjunta
                    </div>
                  )}
                </section>

                {/* Tarjeta 2 - Georreferenciación Operativa */}
                <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Ubicación Georreferenciada
                  </h4>
                  <div className="h-36 rounded-lg overflow-hidden border border-slate-200 relative">
                    <MiniIncidentMap
                      lat={selectedIncident.lat ?? selectedIncident.latitud}
                      lng={selectedIncident.lng ?? selectedIncident.longitud}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-500">
                      {selectedIncident.lat}, {selectedIncident.lng}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedIncident.lat},${selectedIncident.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      <span>Abrir en Google Maps</span>
                    </a>
                  </div>
                </section>
              </div>
            </div>

            {/* Pie de Expediente: Pipeline de Trazabilidad */}
            <footer className="border-t border-slate-200 bg-white p-5">
              {isDismissed && (
                <div className="mb-3 flex justify-end">
                  <span className="rounded bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                    Expediente Desestimado
                  </span>
                </div>
              )}

              {/* Pipeline Secuencial de Estados */}
              <div className="relative mb-5 px-3">
                {/* Barra horizontal base */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -translate-y-1/2 z-0" />
                {/* Barra horizontal de progreso completado */}
                <div
                  className="absolute top-4 left-6 h-1 bg-emerald-500 -translate-y-1/2 transition-all duration-300 z-0"
                  style={{
                    width: isResolved
                      ? "calc(100% - 3rem)"
                      : currentStageIndex <= 0 || isDismissed
                        ? "0%"
                        : `${(currentStageIndex / (PIPELINE_STAGES.length - 1)) * 100}%`,
                  }}
                />

                <div className="relative z-10 flex items-center justify-between">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isCompleted =
                      isResolved || (!isDismissed && currentStageIndex > idx);
                    const isCurrent =
                      !isResolved && !isDismissed && currentStageIndex === idx;

                    let circleClasses =
                      "border border-slate-300 text-slate-400 bg-white";
                    if (isCompleted) {
                      circleClasses =
                        "bg-emerald-600 text-white border border-emerald-600 shadow-xs";
                    } else if (isCurrent) {
                      circleClasses =
                        "bg-[#081D30] text-white ring-2 ring-blue-500/30 shadow-sm";
                    }

                    let textClasses = "font-medium text-slate-400";
                    if (isCompleted) {
                      textClasses = "font-medium text-slate-700";
                    } else if (isCurrent) {
                      textClasses = "font-bold text-[#081D30]";
                    }

                    return (
                      <div
                        key={stage.key}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${circleClasses}`}
                        >
                          {isCompleted ? (
                            <Check size={14} strokeWidth={3} />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <span
                          className={`mt-2 text-xs text-center ${textClasses}`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Controles de Acción (Solo si el expediente está en curso) */}
              {!isResolved && !isDismissed && actionState.mode === "IDLE" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  {canAdvance && nextStage ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActionState({
                          mode: "CONFIRM",
                          targetStatus: nextStage.key,
                          reason: "Transición de etapa operativa",
                        })
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#081D30] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                    >
                      <span>
                        Avanzar a:{" "}
                        {INCIDENT_STATUS[nextStage.key]?.label ||
                          nextStage.label}
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setActionState({
                        mode: "REJECT",
                        targetStatus: "DESESTIMADO",
                        reason: "Reporte duplicado o ya atendido",
                      })
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                  >
                    <span>Desestimar / Rechazar</span>
                  </button>
                </div>
              )}

              {actionState.mode === "CONFIRM" && (
                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                    <AlertTriangle
                      size={16}
                      className="text-blue-700 shrink-0"
                    />
                    ¿Confirmar actualización a estado{" "}
                    <strong className="underline">
                      {INCIDENT_STATUS[actionState.targetStatus]?.label ||
                        actionState.targetStatus}
                    </strong>{" "}
                    para este expediente?
                  </p>
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={resetActionState}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(actionState.targetStatus)
                      }
                      className="rounded-lg bg-[#081D30] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                    >
                      Confirmar Transición
                    </button>
                  </div>
                </div>
              )}

              {actionState.mode === "REJECT" && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3.5">
                  <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                    <AlertTriangle size={15} />
                    Desestimación del expediente
                  </p>
                  <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-red-700">
                    Motivo de Desestimación
                  </label>
                  <select
                    value={actionState.reason}
                    onChange={(event) =>
                      setActionState((state) => ({
                        ...state,
                        reason: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="Reporte duplicado o ya atendido">
                      Reporte duplicado o ya atendido
                    </option>
                    <option value="Evidencia fotográfica inconsistente o falsa">
                      Evidencia fotográfica inconsistente o falsa
                    </option>
                    <option value="Incidente fuera de competencia territorial">
                      Incidente fuera de competencia territorial / jurisdicción
                    </option>
                    <option value="Dirección o coordenadas imprecisas">
                      Dirección o coordenadas imprecisas
                    </option>
                  </select>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetActionState}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("DESESTIMADO")}
                      className="rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-800 transition cursor-pointer shadow-xs"
                    >
                      Confirmar Rechazo
                    </button>
                  </div>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* Modal de Seguridad 2FA */}
      <Security2FAModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
};
