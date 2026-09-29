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

  // Manejo del cambio de estado en tiempo real (Mock Store)
  const handleStatusChange = (newStatus) => {
    if (!selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, newStatus);
    // Sincronizar estado local del dashboard
    setIncidents(getIncidentsByEntity(user?.entityId));
    setSelectedIncident((prev) => ({ ...prev, status: newStatus }));
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
              Operador Autorizado
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
                  onClick={() => setFilterStatus(st)}
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  filteredIncidents.map((inc) => {
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
        </section>
      </main>

      {/* Modal / Panel Lateral de Inspección y Trazabilidad */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in duration-150">
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
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Detalle */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span>
                      Ciudadano Reportante: DNI {selectedIncident.citizenDni}
                    </span>
                  </div>
                </div>

                {/* Evidencia Fotográfica */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Evidencia Visual Capturada
                  </label>
                  {selectedIncident.photoUrl ? (
                    <div className="rounded border border-slate-200 overflow-hidden h-44 bg-slate-900">
                      <img
                        src={selectedIncident.photoUrl}
                        alt="Evidencia del daño"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-slate-300 h-44 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                      <FileText size={28} className="mb-1 opacity-50" />
                      <span className="text-xs">Sin evidencia fotográfica</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción Ciudadana */}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["REGISTRADO", "EVALUACION", "REPARACION", "RESUELTO"].map(
                    (stKey) => {
                      const isCurrent = selectedIncident.status === stKey;
                      return (
                        <button
                          key={stKey}
                          type="button"
                          onClick={() => handleStatusChange(stKey)}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
