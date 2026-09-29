import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getIncidentsByEntity,
  updateIncidentStatus,
  INCIDENT_STATUS,
} from "../services/mockData";
import {
  ShieldAlert,
  LogOut,
  Search,
  Filter,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Layers,
  User,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Cpu,
  AlertTriangle,
} from "lucide-react";

export const EntityDashboardPage = () => {
  const { user, logout } = useAuth();

  // Carga reactiva de los incidentes asignados exclusivamente a la entidad del usuario
  const [incidents, setIncidents] = useState(() =>
    getIncidentsByEntity(user?.entityId),
  );
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionState, setActionState] = useState({
    mode: "IDLE",
    targetStatus: null,
    reason: "Reporte duplicado o ya atendido",
  });

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
      item.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
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

  // Manejo del cambio de estado en tiempo real (Mock Store)
  const handleStatusChange = (newStatus) => {
    if (!selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, newStatus);
    // Sincronizar estado local del dashboard
    setIncidents(getIncidentsByEntity(user?.entityId));
    setSelectedIncident((prev) => ({ ...prev, status: newStatus }));
    setActionState({
      mode: "IDLE",
      targetStatus: null,
      reason: "Reporte duplicado o ya atendido",
    });
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Barra de Navegación Institucional */}
      <header className="bg-[#081D30] text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <ShieldAlert size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">
                VíaAlerta Operaciones
              </h1>
              <span className="text-[10px] bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-700 font-semibold uppercase">
                {user?.entityId === "ENT-SEDAPAL"
                  ? "Saneamiento"
                  : "Vialidad Urbana"}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {user?.entityName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold block">{user?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {user?.email}
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-blue-200">
              Sede técnica ·{" "}
              {user?.jurisdiction || "Jurisdicción institucional"}
            </span>
          </div>
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-700 text-slate-200 hover:text-white text-xs font-medium rounded border border-slate-700 transition"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
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
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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
                  className={`px-3 py-1 text-xs font-semibold rounded transition whitespace-nowrap ${
                    filterStatus === st
                      ? "bg-[#081D30] text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st === "TODOS" ? "Todos" : INCIDENT_STATUS[st]?.label || st}
                </button>
              ))}
            </div>

            {/* Barra de Búsqueda */}
            <div className="relative min-w-[260px]">
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
          </div>

          {/* Tabla de Incidentes */}
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
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400"
                    >
                      <FileText size={32} className="mx-auto mb-2 opacity-40" />
                      No se encontraron incidentes con los criterios
                      seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedIncidents.map((inc) => {
                    const statusInfo =
                      INCIDENT_STATUS[inc.status] || INCIDENT_STATUS.REGISTRADO;
                    const isSelected = selectedIncident?.id === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        className={`hover:bg-blue-50/40 transition cursor-pointer ${isSelected ? "bg-blue-50/70" : ""}`}
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
                        <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {inc.createdAt}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIncident(inc);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded transition"
                          >
                            <ArrowUpRight size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
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
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal / Panel Lateral de Inspección y Trazabilidad */}
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
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 overflow-y-auto">
              <div className="md:col-span-7 space-y-4">
                <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-50 p-2 text-indigo-600">
                        <Cpu size={17} />
                      </span>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Dictamen de triaje automático (IA)
                      </h3>
                    </div>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold px-2 py-0.5 rounded">
                      Certeza: {selectedIncident.aiTriage?.confidence || "N/D"}
                    </span>
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
                      <p className="font-bold text-slate-700">
                        Ubicación física
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedIncident.address}
                      </p>
                      <p className="text-slate-500">
                        {selectedIncident.district} · Zona técnica asignada
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">
                        Ciudadano reportante
                      </p>
                      <p className="mt-1 font-mono text-slate-700">
                        DNI{" "}
                        {selectedIncident.citizenDni
                          ? `${selectedIncident.citizenDni.slice(0, 4)}****`
                          : "No registrado"}
                      </p>
                      <p className="text-emerald-700">
                        Identidad verificada en plataforma
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[11px]">
                    <span className="font-mono text-slate-600">
                      {selectedIncident.lat}, {selectedIncident.lng}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${selectedIncident.lat},${selectedIncident.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                    >
                      Abrir en Google Maps <ExternalLink size={12} />
                    </a>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Observación complementaria
                    </p>
                    <p className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs italic text-slate-700">
                      {selectedIncident.description}
                    </p>
                  </div>
                </section>
              </div>
              <div className="md:col-span-5 space-y-4">
                <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Evidencia visual capturada
                  </h3>
                  {selectedIncident.photoUrl ? (
                    <>
                      <img
                        src={selectedIncident.photoUrl}
                        alt="Evidencia del daño"
                        className="h-52 w-full object-cover rounded-lg border border-slate-200"
                      />
                      <p className="font-mono text-[10px] text-slate-500">
                        Fecha de captura: {selectedIncident.createdAt}
                      </p>
                    </>
                  ) : (
                    <div className="h-44 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <FileText size={28} className="mb-2" />
                      <span className="text-xs">
                        Sin evidencia fotográfica adjunta
                      </span>
                    </div>
                  )}
                </section>
              </div>
              {/* Datos del Reportante y Localización */}
              <div className="hidden">
                {/* Datos del Reportante y Localización */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Avería Reportada
                    </label>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedIncident.categoryName}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Jurisdicción / Ubicación
                    </label>
                    <p className="text-xs text-slate-700 font-medium">
                      {selectedIncident.district}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedIncident.address}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <MapPin size={14} className="text-blue-600" />
                      <span>Coordenadas Georreferenciadas</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-600">
                      Lat: {selectedIncident.lat} | Lng: {selectedIncident.lng}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${selectedIncident.lat},${selectedIncident.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <span>Abrir en Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 rounded border border-slate-200 p-3 text-xs text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span>
                      Identidad Protegida: DNI{" "}
                      {selectedIncident.citizenDni
                        ? selectedIncident.citizenDni.slice(0, 4) + "****"
                        : "No registrado"}
                    </span>
                  </div>
                </div>

                {/* Evidencia Fotográfica */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Evidencia Visual Capturada
                  </label>
                  {selectedIncident.photoUrl ? (
                    <div className="relative h-56 bg-slate-900 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
                      <img
                        src={selectedIncident.photoUrl}
                        alt="Evidencia del daño"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-200">
                        Fecha de captura: {selectedIncident.createdAt}
                      </span>
                    </div>
                  ) : (
                    <div className="h-56 bg-slate-900 rounded-lg overflow-hidden border border-slate-300 relative flex flex-col items-center justify-center text-slate-400">
                      <FileText size={28} className="mb-1 opacity-50" />
                      <span className="text-xs">Sin evidencia fotográfica</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción Ciudadana */}
              <div className="hidden">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Observaciones del Ciudadano
                  </label>
                  <p className="text-xs text-slate-700 italic">
                    "{selectedIncident.description}"
                  </p>
                </div>

                {/* Controles de Trazabilidad (Cambio de Estado) */}
                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Actualizar Estado de Trazabilidad
                  </label>
                  {actionState.mode === "IDLE" && (
                    <button
                      type="button"
                      onClick={() =>
                        setActionState({
                          mode: "REJECT",
                          targetStatus: "DESESTIMADO",
                          reason: "Reporte Duplicado",
                        })
                      }
                      className="mb-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold px-3 py-1.5 rounded"
                    >
                      Desestimar / Rechazar
                    </button>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["REGISTRADO", "EVALUACION", "REPARACION", "RESUELTO"].map(
                      (stKey) => {
                        const isCurrent = selectedIncident.status === stKey;
                        return (
                          <button
                            key={stKey}
                            type="button"
                            disabled={isCurrent || actionState.mode !== "IDLE"}
                            onClick={() =>
                              setActionState({
                                mode: "CONFIRM",
                                targetStatus: stKey,
                                reason: "",
                              })
                            }
                            className={`py-2 px-2 text-xs font-bold rounded border text-center transition ${
                              isCurrent
                                ? "bg-[#081D30] text-white border-[#081D30] shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {INCIDENT_STATUS[stKey]?.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                  {actionState.mode === "CONFIRM" && (
                    <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-900">
                        ¿Confirmar actualización del expediente a estado{" "}
                        {INCIDENT_STATUS[actionState.targetStatus]?.label}?
                      </p>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={resetActionState}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(actionState.targetStatus)
                          }
                          className="rounded bg-[#081D30] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          Confirmar Transición
                        </button>
                      </div>
                    </div>
                  )}
                  {actionState.mode === "REJECT" && (
                    <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-bold text-red-800">
                        Desestimación del Expediente
                      </p>
                      <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-red-700">
                        Motivo
                      </label>
                      <select
                        value={actionState.reason}
                        onChange={(event) =>
                          setActionState((state) => ({
                            ...state,
                            reason: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded border border-red-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="Reporte Duplicado">
                          Reporte duplicado o ya atendido
                        </option>
                        <option value="Evidencia fotográfica no concluyente o falsa">
                          Evidencia fotográfica no concluyente o falsa
                        </option>
                        <option value="Incidente fuera de competencia territorial / jurisdicción">
                          Incidente fuera de competencia territorial /
                          jurisdicción
                        </option>
                        <option value="Datos de ubicación imprecisos">
                          Datos de ubicación imprecisos
                        </option>
                      </select>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={resetActionState}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange("DESESTIMADO")}
                          className="rounded bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800"
                        >
                          Confirmar Desestimación
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <footer className="border-t border-slate-200 bg-white p-4">
              {actionState.mode === "IDLE" && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Actualizar estado de trazabilidad
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActionState({
                          mode: "REJECT",
                          targetStatus: "DESESTIMADO",
                          reason: "Reporte duplicado o ya atendido",
                        })
                      }
                      className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold px-3 py-1 rounded"
                    >
                      Desestimar / Rechazar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["REGISTRADO", "EVALUACION", "REPARACION", "RESUELTO"].map(
                      (stKey) => (
                        <button
                          key={stKey}
                          type="button"
                          disabled={selectedIncident.status === stKey}
                          onClick={() =>
                            setActionState({
                              mode: "CONFIRM",
                              targetStatus: stKey,
                              reason: "Reporte duplicado o ya atendido",
                            })
                          }
                          className={`py-2 px-2 text-xs font-bold rounded border transition ${selectedIncident.status === stKey ? "bg-[#081D30] text-white border-[#081D30]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {INCIDENT_STATUS[stKey]?.label}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
              {actionState.mode === "CONFIRM" && (
                <div className="rounded border border-blue-200 bg-blue-50 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                    <AlertTriangle size={16} />
                    ¿Confirmar actualización a estado{" "}
                    {INCIDENT_STATUS[actionState.targetStatus]?.label} para este
                    expediente?
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetActionState}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(actionState.targetStatus)
                      }
                      className="rounded bg-[#081D30] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Confirmar Transición
                    </button>
                  </div>
                </div>
              )}
              {actionState.mode === "REJECT" && (
                <div className="rounded border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-800">
                    Desestimación del expediente
                  </p>
                  <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-red-700">
                    Motivo
                  </label>
                  <select
                    value={actionState.reason}
                    onChange={(event) =>
                      setActionState((state) => ({
                        ...state,
                        reason: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded border border-red-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option>Reporte duplicado o ya atendido</option>
                    <option>Evidencia fotográfica inconsistente o falsa</option>
                    <option>Incidente fuera de competencia territorial</option>
                    <option>Dirección o coordenadas imprecisas</option>
                  </select>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetActionState}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("DESESTIMADO")}
                      className="rounded bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800"
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
    </div>
  );
};
