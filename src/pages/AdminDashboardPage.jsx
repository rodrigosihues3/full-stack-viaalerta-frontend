import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getIncidents, ENTITIES, INCIDENT_STATUS } from "../services/mockData";
import {
  ShieldAlert,
  LogOut,
  Search,
  Building2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";

export const AdminDashboardPage = () => {
  const { user, logout } = useAuth();

  // Consulta de todo el universo metropolitano de incidentes
  const [allIncidents] = useState(() => getIncidents());
  const [activeTab, setActiveTab] = useState("incidentes"); // 'incidentes' | 'entidades'
  const [selectedEntityFilter, setSelectedEntityFilter] = useState("TODAS");
  const [searchTerm, setSearchTerm] = useState("");

  // Métricas metropolitanas agregadas
  const totalMetropolitano = allIncidents.length;
  const mmlCount = allIncidents.filter((i) => i.entityId === "ENT-MML").length;
  const sedapalCount = allIncidents.filter(
    (i) => i.entityId === "ENT-SEDAPAL",
  ).length;
  const criticosCount = allIncidents.filter(
    (i) => i.severity === "Critica",
  ).length;
  const resueltosCount = allIncidents.filter(
    (i) => i.status === "RESUELTO",
  ).length;
  const tasaResolucion =
    totalMetropolitano > 0
      ? Math.round((resueltosCount / totalMetropolitano) * 100)
      : 0;

  // Filtrado compuesto para la consola central
  const filteredIncidents = allIncidents.filter((item) => {
    const matchesEntity =
      selectedEntityFilter === "TODAS" ||
      item.entityId === selectedEntityFilter;
    const matchesSearch =
      item.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.entityName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEntity && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Cabecera Centralizada */}
      <header className="bg-[#081D30] text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-lg text-slate-950">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">
                VíaAlerta Consola Central
              </h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-semibold uppercase">
                Super Administrador
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Fiscalización y Gobernanza Metropolitana
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold block">{user?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Control Maestro
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
        {/* Métricas Agregadas de Lima Metropolitana */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Metropolitano
              </span>
              <Layers size={16} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {totalMetropolitano}
            </p>
            <span className="text-[10px] text-slate-400">
              Total reportes en Lima
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-blue-600 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Carga MML
              </span>
              <Building2 size={16} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{mmlCount}</p>
            <span className="text-[10px] text-slate-400">
              Infraestructura vial
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-cyan-600 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Carga Sedapal
              </span>
              <Building2 size={16} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{sedapalCount}</p>
            <span className="text-[10px] text-slate-400">Redes sanitarias</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-red-600 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Peligro Crítico
              </span>
              <AlertCircle size={16} />
            </div>
            <p className="text-2xl font-bold text-red-600">{criticosCount}</p>
            <span className="text-[10px] text-slate-400">
              Riesgo vital expuesto
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-emerald-600 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Efectividad
              </span>
              <TrendingUp size={16} />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {tasaResolucion}%
            </p>
            <span className="text-[10px] text-slate-400">
              Tasa de resolución
            </span>
          </div>
        </section>

        {/* Pestañas de Vista */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-4 pt-2">
          <button
            onClick={() => setActiveTab("incidentes")}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
              activeTab === "incidentes"
                ? "border-[#081D30] text-[#081D30]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <FileSpreadsheet size={16} />
            Consolidado Metropolitano ({filteredIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab("entidades")}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
              activeTab === "entidades"
                ? "border-[#081D30] text-[#081D30]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <Building2 size={16} />
            Directorio de Entidades Públicas (2)
          </button>
        </div>

        {/* Contenido Según Pestaña Activa */}
        {activeTab === "incidentes" ? (
          <section className="bg-white rounded-b-lg border-x border-b border-slate-200 shadow-2xs overflow-hidden">
            {/* Filtros de Entidad y Búsqueda */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mr-1">
                  Filtrar Entidad:
                </span>
                <button
                  onClick={() => setSelectedEntityFilter("TODAS")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    selectedEntityFilter === "TODAS"
                      ? "bg-[#081D30] text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Todas ({totalMetropolitano})
                </button>
                <button
                  onClick={() => setSelectedEntityFilter("ENT-MML")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    selectedEntityFilter === "ENT-MML"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  MML Obras ({mmlCount})
                </button>
                <button
                  onClick={() => setSelectedEntityFilter("ENT-SEDAPAL")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    selectedEntityFilter === "ENT-SEDAPAL"
                      ? "bg-cyan-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Sedapal ({sedapalCount})
                </button>
              </div>

              <div className="relative min-w-[280px]">
                <Search
                  size={16}
                  className="absolute inset-y-0 left-3 my-auto text-slate-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar en toda Lima (ticket, distrito, avería)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#081D30]"
                />
              </div>
            </div>

            {/* Tabla Consolidada */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Entidad Responsable</th>
                    <th className="py-3 px-4">Avería Reportada</th>
                    <th className="py-3 px-4">Distrito</th>
                    <th className="py-3 px-4 text-center">Severidad</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.map((inc) => {
                    const statusInfo =
                      INCIDENT_STATUS[inc.status] || INCIDENT_STATUS.REGISTRADO;
                    const isSedapal = inc.entityId === "ENT-SEDAPAL";
                    return (
                      <tr
                        key={inc.id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {inc.ticketNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isSedapal
                                ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {isSedapal ? "Sedapal" : "MML Obras"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {inc.categoryName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 block">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          /* Directorio de Entidades Públicas Adscritas */
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {ENTITIES.MML.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Jurisdicción Provincial
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">
                  Activa
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gestión técnica y mantenimiento de la capa asfáltica,
                señalización horizontal y veredas peatonales en las arterias
                principales de Lima.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Operador: operador@mml.gob.pe</span>
                <span className="font-bold text-blue-600">
                  {mmlCount} casos asignados
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {ENTITIES.SEDAPAL.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Empresa Pública de Saneamiento
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">
                  Activa
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fiscalización y reparación de colectores de desagüe, reposición
                de tapas de buzón sustraídas y control de fugas en tuberías
                matrices.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Operador: admin@sedapal.com.pe</span>
                <span className="font-bold text-cyan-600">
                  {sedapalCount} casos asignados
                </span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
