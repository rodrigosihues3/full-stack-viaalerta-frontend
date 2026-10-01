import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createEntity,
  getEntities,
  getIncidents,
  INCIDENT_STATUS,
} from "../services/mockData";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

const PAGE_SIZE = 6;
const emptyForm = {
  name: "",
  acronym: "",
  jurisdiction: "",
  email: "",
  phone: "",
};
const severityBadge = (value) =>
  value === "Critica"
    ? "bg-red-50 text-red-700 border-red-200"
    : value === "Alta"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

export const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const [incidents] = useState(getIncidents);
  const [entities, setEntities] = useState(getEntities);
  const [tab, setTab] = useState("consolidated");
  const [query, setQuery] = useState("");
  const [entityId, setEntityId] = useState("TODAS");
  const [status, setStatus] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const resetPage = (handler) => (event) => {
    handler(event);
    setPage(1);
  };

  const metrics = useMemo(() => {
    const total = incidents.length;
    const activeIncidents = incidents.filter(
      (item) => !["RESUELTO", "DESESTIMADO"].includes(item.status),
    );
    return {
      total,
      high: incidents.filter((item) => item.severity === "Alta").length,
      medium: incidents.filter((item) => item.severity === "Media").length,
      critical: activeIncidents.filter((item) => item.severity === "Critica")
        .length,
    };
  }, [incidents]);
  const filtered = useMemo(
    () =>
      incidents.filter((item) => {
        const term = query.trim().toLowerCase();
        const matchesText =
          !term ||
          [
            item.ticketNumber,
            item.categoryName,
            item.address,
            item.district,
          ].some((value) => value.toLowerCase().includes(term));
        return (
          matchesText &&
          (entityId === "TODAS" || item.entityId === entityId) &&
          (status === "TODOS" || item.status === status)
        );
      }),
    [entityId, incidents, query, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleRegister = (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setError("Complete todos los campos institucionales.");
      return;
    }
    setEntities((current) => [...current, createEntity(form)]);
    setForm(emptyForm);
    setError("");
    setShowRegister(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="flex items-center justify-between border-b border-slate-800 bg-[#081D30] px-6 py-3.5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-500 p-2 text-slate-950">
              <ShieldCheck size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">
                  Consola Central Metropolitana
                </h1>
              </div>
              <p className="text-xs font-medium text-slate-300">
                Supervisión operativa y gobernanza institucional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <span className="block text-xs font-bold">{user?.name}</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                {user?.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-red-700 hover:text-white"
            >
              <LogOut size={14} />
              Cerrar Sesión
            </button>
          </div>
      </header>
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Carga Total Metropolitana",
              metrics.total,
              "Expedientes consolidados",
              Layers,
              "text-slate-500",
            ],
            [
              "Prioridad Alta",
              metrics.high,
              "Atención prioritaria",
              AlertTriangle,
              "text-amber-600",
            ],
            [
              "Prioridad Media",
              metrics.medium,
              "Atención programable",
              AlertTriangle,
              "text-blue-600",
            ],
            [
              "Alertas Críticas Activas",
              metrics.critical,
              "Severidad crítica",
              AlertTriangle,
              "text-red-600",
            ],
          ].map(([label, value, note, Icon, color]) => (
            <article
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs"
            >
              <div
                className={`mb-2 flex items-center justify-between ${color}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {label}
                </span>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-[10px] text-slate-400">{note}</p>
            </article>
          ))}
        </section>
        <nav className="border-b border-slate-200 bg-white px-3">
          <button
            onClick={() => setTab("consolidated")}
            className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === "consolidated" ? "border-[#081D30] text-[#081D30]" : "border-transparent text-slate-400"}`}
          >
            Consolidado Metropolitano
          </button>
          <button
            onClick={() => setTab("directory")}
            className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === "directory" ? "border-[#081D30] text-[#081D30]" : "border-transparent text-slate-400"}`}
          >
            Directorio de Entidades Públicas
          </button>
        </nav>
        {tab === "consolidated" ? (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search
                  size={15}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  value={query}
                  onChange={resetPage((event) => setQuery(event.target.value))}
                  placeholder="Buscar ticket, avería, dirección o distrito"
                  className="w-full rounded border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-[#081D30]"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Filter size={15} className="text-slate-400" />
                <select
                  value={entityId}
                  onChange={resetPage((event) =>
                    setEntityId(event.target.value),
                  )}
                  className="w-44 py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded"
                >
                  <option value="TODAS">Todas las Entidades</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.acronym}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={resetPage((event) => setStatus(event.target.value))}
                  className="w-40 py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded"
                >
                  <option value="TODOS">Todos los Estados</option>
                  {Object.entries(INCIDENT_STATUS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      "Ticket",
                      "Entidad asignada",
                      "Categoría / Avería",
                      "Ubicación / Distrito",
                      "Severidad",
                      "Estado",
                      "Fecha",
                      "Acción",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length ? (
                    rows.map((incident) => {
                      const entity = entities.find(
                        (item) => item.id === incident.entityId,
                      );
                      const incidentStatus =
                        INCIDENT_STATUS[incident.status] ||
                        INCIDENT_STATUS.REGISTRADO;
                      return (
                        <tr key={incident.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            {incident.ticketNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              {entity?.acronym || incident.entityName}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {incident.categoryName}
                          </td>
                          <td className="px-4 py-3">
                            <p>{incident.district}</p>
                            <p className="max-w-[180px] truncate text-[10px] text-slate-400">
                              {incident.address}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${severityBadge(incident.severity)}`}
                            >
                              {incident.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${incidentStatus.badge}`}
                            >
                              {incidentStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                            {incident.createdAt}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelected(incident)}
                              aria-label={`Inspeccionar ${incident.ticketNumber}`}
                              className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-slate-400"
                      >
                        <FileText size={28} className="mx-auto mb-2" />
                        No se encontraron expedientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} a{" "}
                {Math.min(page * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length} expedientes
              </span>
              <div className="flex items-center gap-2">
                <span>
                  Página {page} de {pages}
                </span>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-bold disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <button
                  disabled={page === pages}
                  onClick={() => setPage((value) => value + 1)}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-bold disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Organizaciones Públicas Adscritas
                </h2>
                <p className="text-xs text-slate-500">
                  Catálogo institucional y capacidad operativa de la red
                  metropolitana.
                </p>
              </div>
              <button
                onClick={() => setShowRegister(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#081D30] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
              >
                <Plus size={15} />
                Registrar Entidad Pública
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entities.map((entity) => {
                const load = incidents.filter(
                  (item) =>
                    item.entityId === entity.id &&
                    !["RESUELTO", "DESESTIMADO"].includes(item.status),
                ).length;
                return (
                  <article
                    key={entity.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2">
                        <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-[11px] font-bold text-blue-800">
                          {entity.acronym}
                        </span>
                        <h3 className="text-xs font-bold text-slate-800">
                          {entity.name}
                        </h3>
                      </div>
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {entity.status}
                      </span>
                    </div>
                    <p className="mt-4 border-l-2 border-slate-300 pl-2 text-xs">
                      {entity.jurisdiction}
                    </p>
                    <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 font-mono text-[11px] text-slate-600">
                      <p>{entity.email}</p>
                      <p>{entity.phone}</p>
                    </div>
                    <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        Carga operativa activa
                      </span>
                      <span className="text-sm font-bold text-[#081D30]">
                        {load}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
      {selected && (
        <InspectionModal
          incident={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <form
            onSubmit={handleRegister}
            className="w-[36rem] max-w-[calc(100vw-2rem)] shrink-0 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between bg-[#081D30] p-4 text-white">
              <div>
                <h2 className="text-sm font-bold">Registrar Entidad Pública</h2>
                <p className="text-[10px] text-slate-300">
                  Alta institucional para asignación operativa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                aria-label="Cerrar registro"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <Field
                label="Razón Social / Nombre Oficial"
                field="name"
                form={form}
                setForm={setForm}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Sigla / Acrónimo"
                  field="acronym"
                  form={form}
                  setForm={setForm}
                />
                <Field
                  label="Central Telefónica de Emergencia"
                  field="phone"
                  form={form}
                  setForm={setForm}
                />
              </div>
              <Field
                label="Competencia Técnica / Jurisdicción"
                field="jurisdiction"
                form={form}
                setForm={setForm}
              />
              <Field
                label="Correo Institucional de Despacho"
                field="email"
                type="email"
                form={form}
                setForm={setForm}
              />
              {error && <p className="text-xs text-red-700">{error}</p>}
            </div>
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#081D30] hover:bg-slate-800 rounded shadow-2xs"
              >
                Registrar Entidad
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const InspectionModal = ({ incident, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-[#081D30] p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-600 px-2 py-0.5 font-mono text-xs font-bold">
            {incident.ticketNumber}
          </span>
          <h2 className="text-sm font-bold">
            Inspección Técnica Metropolitana
          </h2>
        </div>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-12">
        <div className="space-y-4 md:col-span-7">
          <section className="rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-indigo-600" />
                <h3 className="text-[10px] font-bold uppercase">
                  Dictamen de triaje IA
                </h3>
              </div>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                {incident.aiTriage?.confidence || "N/D"}
              </span>
            </div>
            <div className="mt-3 space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
              <p>
                <strong>Avería identificada:</strong>{" "}
                {incident.aiTriage?.detectedIssue || incident.categoryName}
              </p>
              <p>
                <strong>Severidad computada:</strong>{" "}
                {incident.aiTriage?.computedSeverity || incident.severity}
              </p>
              <p>
                <strong>Recomendación:</strong>{" "}
                {incident.aiTriage?.recommendation ||
                  "Pendiente de evaluación técnica."}
              </p>
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 p-4 shadow-2xs">
            <h3 className="text-[10px] font-bold uppercase text-slate-500">
              Expediente ciudadano
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-bold">Ubicación física</p>
                <p className="mt-1">{incident.address}</p>
                <p className="text-slate-500">{incident.district}</p>
              </div>
              <div>
                <p className="font-bold">Ciudadano reportante</p>
                <p className="mt-1 font-mono">
                  DNI {incident.citizenDni?.slice(0, 4)}****
                </p>
                <p className="text-emerald-700">Identidad verificada</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
              <span className="font-mono text-[10px]">
                {incident.lat}, {incident.lng}
              </span>
              <a
                href={`https://maps.google.com/?q=${incident.lat},${incident.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600"
              >
                Google Maps <ExternalLink size={12} />
              </a>
            </div>
          </section>
        </div>
        <div className="md:col-span-5">
          <section className="rounded-lg border border-slate-200 p-4 shadow-2xs">
            <h3 className="mb-3 text-[10px] font-bold uppercase text-slate-500">
              Evidencia visual
            </h3>
            {incident.photoUrl ? (
              <>
                <img
                  src={incident.photoUrl}
                  alt="Evidencia del incidente"
                  className="h-52 w-full rounded-lg border border-slate-200 object-cover"
                />
                <p className="mt-2 font-mono text-[10px] text-slate-500">
                  Captura: {incident.createdAt}
                </p>
              </>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <FileText size={26} />
                <span className="mt-2 text-xs">
                  Sin evidencia fotográfica adjunta
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  </div>
);

const Field = ({ label, field, type = "text", form, setForm }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}
    <input
      type={type}
      value={form[field]}
      onChange={(event) =>
        setForm((current) => ({ ...current, [field]: event.target.value }))
      }
      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs font-normal outline-none focus:ring-1 focus:ring-[#081D30]"
    />
  </label>
);
