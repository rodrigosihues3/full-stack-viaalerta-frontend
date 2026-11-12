import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Security2FAModal } from "../components/Security2FAModal";
import {
  getMetricasAdmin,
  getUsuariosAdmin,
  cambiarEstadoUsuario,
  enviarNotificacionUsuario,
  getEntidadesAdmin,
  crearEntidad,
  actualizarEntidad,
  cambiarEstadoEntidad,
  createOperador,
} from "../services/adminService";
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Activity,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Pencil,
  Power,
  Bell,
  Send,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

// Datos de contingencia inicial para garantizar operatividad continua
const FALLBACK_ENTITIES = [
  {
    id: "ENT-MML-001",
    nombre: "Municipalidad Metropolitana de Lima",
    name: "Municipalidad Metropolitana de Lima",
    sigla: "MML",
    acronym: "MML",
    ruc: "20131380951",
    tipo: "MUNICIPALIDAD",
    jurisdiccion: "Vialidad Urbana y Redes Metropolitanas - Cercado",
    jurisdiction: "Vialidad Urbana y Redes Metropolitanas - Cercado",
    email: "operaciones@mml.gob.pe",
    telefono: "(01) 632-1300",
    phone: "(01) 632-1300",
    activa: true,
  },
  {
    id: "ENT-SEDAPAL-002",
    nombre: "Servicio de Agua Potable y Alcantarillado de Lima",
    name: "Servicio de Agua Potable y Alcantarillado de Lima",
    sigla: "SEDAPAL",
    acronym: "SEDAPAL",
    ruc: "20100152356",
    tipo: "EMPRESA_ESTATAL",
    jurisdiccion: "Redes Matrices de Agua Potable y Alcantarillado",
    jurisdiction: "Redes Matrices de Agua Potable y Alcantarillado",
    email: "operaciones@sedapal.com.pe",
    telefono: "(01) 317-8000",
    phone: "(01) 317-8000",
    activa: true,
  },
];

const FALLBACK_USERS = [
  {
    id: "USR-001",
    dni: "71234567",
    nombres: "Juan Carlos",
    apellidos: "Pérez Ramos",
    email: "ciudadano@correo.pe",
    rol: "CIUDADANO",
    activo: true,
    fiabilidad_pct: 94,
    total_reportes: 12,
    reportes_desestimados: 0,
    reportes_resueltos: 9,
  },
  {
    id: "USR-002",
    dni: "45678901",
    nombres: "María Elena",
    apellidos: "Gómez Flores",
    email: "maria.gomez@gmail.com",
    rol: "CIUDADANO",
    activo: true,
    fiabilidad_pct: 68,
    total_reportes: 8,
    reportes_desestimados: 2,
    reportes_resueltos: 4,
  },
  {
    id: "USR-003",
    dni: "08912345",
    nombres: "Luis Alberto",
    apellidos: "Mendoza Silva",
    email: "luis.mendoza@outlook.com",
    rol: "CIUDADANO",
    activo: true,
    fiabilidad_pct: 42,
    total_reportes: 6,
    reportes_desestimados: 4,
    reportes_resueltos: 1,
  },
  {
    id: "USR-004",
    dni: "10293847",
    nombres: "Carlos",
    apellidos: "Navarro Ruiz",
    email: "operaciones@mml.gob.pe",
    rol: "OPERADOR_ENTIDAD",
    entidad_id: "ENT-MML-001",
    entidad_nombre: "Municipalidad Metropolitana de Lima",
    activo: true,
    fiabilidad_pct: null,
    total_reportes: 0,
  },
  {
    id: "USR-005",
    dni: "20394857",
    nombres: "Patricia",
    apellidos: "Vega Castro",
    email: "operaciones@sedapal.com.pe",
    rol: "OPERADOR_ENTIDAD",
    entidad_id: "ENT-SEDAPAL-002",
    entidad_nombre: "Sedapal Saneamiento",
    activo: true,
    fiabilidad_pct: null,
    total_reportes: 0,
  },
  {
    id: "USR-006",
    dni: "00000001",
    nombres: "Administrador Central",
    apellidos: "Gobernanza",
    email: "admin@viaalerta.gob.pe",
    rol: "SUPER_ADMIN",
    activo: true,
    fiabilidad_pct: null,
    total_reportes: 0,
  },
];

const NOTIFICATION_TEMPLATES = [
  {
    id: "desestimados",
    label: "Exceso de reportes desestimados",
    tipo: "ADVERTENCIA",
    titulo: "Advertencia por reportes desestimados reiterados",
    mensaje:
      "Se ha detectado una tasa reiterada de reportes no conformes o desestimados por los equipos de fiscalización vial. Le instamos a verificar la veracidad de la incidencia antes de emitirla.",
  },
  {
    id: "evidencia",
    label: "Evidencia inconsistente",
    tipo: "ADVERTENCIA",
    titulo: "Observación de evidencia fotográfica adjunta",
    mensaje:
      "Las fotografías remitidas en sus expedientes recientes no concuerdan con la calzada o coordenadas geográficas declaradas. Asegúrese de enviar material nítido y fidedigno.",
  },
  {
    id: "suspension",
    label: "Aviso de suspensión preventiva",
    tipo: "URGENTE",
    titulo: "Aviso de suspensión preventiva de cuenta ciudadana",
    mensaje:
      "Debido a reiteradas alertas desestimadas y uso indebido del canal metropolitano, su cuenta ha entrado en régimen de observación y podría ser inhabilitada preventivamente.",
  },
  {
    id: "personalizado",
    label: "Texto personalizado",
    tipo: "INFORMATIVO",
    titulo: "Comunicado oficial de supervisión metropolitana",
    mensaje: "",
  },
];

const PAGE_SIZE = 8;

export const AdminDashboardPage = () => {
  const { user, logout } = useAuth();

  // Estados principales de datos
  const [metricas, setMetricas] = useState(null);
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pestaña activa: "entidades" | "usuarios"
  const [activeTab, setActiveTab] = useState("entidades");

  // Filtros del Módulo Entidades
  const [queryEntities, setQueryEntities] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("TODAS");
  const [viewEntities, setViewEntities] = useState("cards"); // "cards" | "table"
  const [pageEntities, setPageEntities] = useState(1);

  // Filtros del Módulo Usuarios
  const [queryUsers, setQueryUsers] = useState("");
  const [filterUserRole, setFilterUserRole] = useState("TODOS");
  const [viewUsers, setViewUsers] = useState("cards"); // "cards" | "table"
  const [pageUsers, setPageUsers] = useState(1);

  // Dropdown de perfil
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Modales
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityModalForceSetup, setSecurityModalForceSetup] = useState(false);
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [isCreateOperatorOpen, setIsCreateOperatorOpen] = useState(false);

  // Mensaje flotante de feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);

  // Cierre del dropdown de perfil al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carga inicial de datos administrativos
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [metricasRes, entidadesRes, usuariosRes] = await Promise.allSettled([
          getMetricasAdmin(),
          getEntidadesAdmin(),
          getUsuariosAdmin(),
        ]);

        if (!isMounted) return;

        if (metricasRes.status === "fulfilled" && metricasRes.value) {
          setMetricas(metricasRes.value);
        }

        if (
          entidadesRes.status === "fulfilled" &&
          Array.isArray(entidadesRes.value) &&
          entidadesRes.value.length > 0
        ) {
          setEntities(
            entidadesRes.value.map((e) => ({
              ...e,
              id: e.id || e._id,
              nombre_oficial: e.nombre_oficial || e.nombre || e.name || "",
              nombre: e.nombre_oficial || e.nombre || e.name || "",
              sigla: e.sigla || e.acronym || "",
              ruc: e.ruc || "",
              tipo: e.tipo || (e.sigla === "MML" ? "MUNICIPALIDAD" : "EMPRESA_ESTATAL"),
              jurisdiccion: e.jurisdiccion || e.jurisdiccion_competencia || e.jurisdiction || "",
              email_despacho: e.email_despacho || e.correo_despacho || e.email_contacto || e.email || "",
              email: e.email_despacho || e.correo_despacho || e.email_contacto || e.email || "",
              telefono: e.telefono || e.telefono_emergencia || e.central_telefonica || e.phone || "",
              central_telefonica: e.telefono || e.telefono_emergencia || e.central_telefonica || "",
              latitud: e.latitud || null,
              longitud: e.longitud || null,
              activa: e.activa ?? e.activo ?? true,
            }))
          );
        } else {
          setEntities(FALLBACK_ENTITIES);
        }

        if (
          usuariosRes.status === "fulfilled" &&
          Array.isArray(usuariosRes.value) &&
          usuariosRes.value.length > 0
        ) {
          setUsers(
            usuariosRes.value.map((u) => ({
              ...u,
              id: u.id || u._id,
              dni: u.dni || "00000000",
              nombres: u.nombres || u.name || "Usuario",
              apellidos: u.apellidos || "",
              email: u.email,
              rol: u.rol || u.role || "CIUDADANO",
              activo: u.activo ?? true,
              fiabilidad_pct:
                typeof u.fiabilidad_pct === "number"
                  ? u.fiabilidad_pct
                  : u.rol === "CIUDADANO"
                    ? 85
                    : null,
              total_reportes: u.total_reportes ?? 0,
            }))
          );
        } else {
          setUsers(FALLBACK_USERS);
        }
      } catch (err) {
        console.error("Error al sincronizar datos administrativos:", err);
        if (isMounted) {
          setEntities(FALLBACK_ENTITIES);
          setUsers(FALLBACK_USERS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cálculos consolidados para Tarjetas KPI de Gobernanza
  const kpiData = useMemo(() => {
    const totalEntidades = metricas?.total_entidades ?? entities.length;

    const mml = metricas?.desglose_entidades
      ? (metricas.desglose_entidades.mml ??
        metricas.desglose_entidades.MML ??
        metricas.desglose_entidades["Municipalidad"] ??
        0)
      : entities.filter(
        (e) =>
          e.tipo === "MUNICIPALIDAD" ||
          (e.sigla || e.acronym || "").toUpperCase().includes("MML")
      ).length;

    const sedapal = metricas?.desglose_entidades
      ? (metricas.desglose_entidades.sedapal ??
        metricas.desglose_entidades.SEDAPAL ??
        metricas.desglose_entidades["Sedapal"] ??
        0)
      : entities.filter(
        (e) =>
          e.tipo === "EMPRESA_ESTATAL" ||
          (e.sigla || e.acronym || "").toUpperCase().includes("SEDAPAL")
      ).length;

    const totalOperadores =
      metricas?.total_operadores ??
      users.filter((u) => u.rol === "OPERADOR_ENTIDAD").length;

    const ciudadanos = users.filter((u) => u.rol === "CIUDADANO");
    const totalCiudadanos = metricas?.total_ciudadanos ?? ciudadanos.length;

    let fiabilidadGlobal = metricas?.fiabilidad_global;
    if (typeof fiabilidadGlobal !== "number") {
      if (ciudadanos.length > 0) {
        const sum = ciudadanos.reduce(
          (acc, c) => acc + (typeof c.fiabilidad_pct === "number" ? c.fiabilidad_pct : 85),
          0
        );
        fiabilidadGlobal = Math.round(sum / ciudadanos.length);
      } else {
        fiabilidadGlobal = 94;
      }
    }

    return {
      totalEntidades,
      desglose: `MML: ${mml} | SEDAPAL: ${sedapal}`,
      totalOperadores,
      totalCiudadanos,
      fiabilidadGlobal,
    };
  }, [entities, users, metricas]);

  // Filtrado reactivo de Entidades
  const filteredEntities = useMemo(() => {
    const q = queryEntities.trim().toLowerCase();
    return entities.filter((ent) => {
      const matchText =
        !q ||
        (ent.nombre || ent.name || "").toLowerCase().includes(q) ||
        (ent.sigla || ent.acronym || "").toLowerCase().includes(q) ||
        (ent.ruc || "").toLowerCase().includes(q) ||
        (ent.jurisdiccion || ent.jurisdiction || "").toLowerCase().includes(q);

      const matchType =
        filterEntityType === "TODAS" ||
        ent.tipo === filterEntityType ||
        (filterEntityType === "MUNICIPALIDAD" &&
          (ent.sigla || "").toUpperCase().includes("MML")) ||
        (filterEntityType === "EMPRESA_ESTATAL" &&
          (ent.sigla || "").toUpperCase().includes("SEDAPAL"));

      return matchText && matchType;
    });
  }, [entities, queryEntities, filterEntityType]);

  // Paginación de Entidades
  const totalEntityPages = Math.max(1, Math.ceil(filteredEntities.length / PAGE_SIZE));
  const paginatedEntities = useMemo(() => {
    const start = (pageEntities - 1) * PAGE_SIZE;
    return filteredEntities.slice(start, start + PAGE_SIZE);
  }, [filteredEntities, pageEntities]);

  // Filtrado reactivo de Usuarios
  const filteredUsers = useMemo(() => {
    const q = queryUsers.trim().toLowerCase();
    return users.filter((usr) => {
      const matchText =
        !q ||
        (usr.dni || "").toLowerCase().includes(q) ||
        `${usr.nombres || ""} ${usr.apellidos || ""}`.toLowerCase().includes(q) ||
        (usr.email || "").toLowerCase().includes(q);

      const matchRole =
        filterUserRole === "TODOS" || usr.rol === filterUserRole;

      return matchText && matchRole;
    });
  }, [users, queryUsers, filterUserRole]);

  // Paginación de Usuarios
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (pageUsers - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, pageUsers]);

  // Acciones: Entidades
  const handleOpenCreateEntity = () => {
    setEditingEntity(null);
    setEntityModalOpen(true);
  };

  const handleOpenEditEntity = (entity) => {
    setEditingEntity(entity);
    setEntityModalOpen(true);
  };

  const handleSaveEntity = async (entityData) => {
    try {
      if (editingEntity) {
        await actualizarEntidad(editingEntity.id, entityData).catch(() => null);
        setEntities((prev) =>
          prev.map((item) =>
            item.id === editingEntity.id ? { ...item, ...entityData } : item
          )
        );
        showToast("Entidad pública actualizada satisfactoriamente.");
      } else {
        const idGenerado = `ENT-${(entityData.sigla || "ENT").toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const payload = {
          id: idGenerado,
          ...entityData,
          activa: true,
        };
        await crearEntidad(payload).catch(() => null);
        setEntities((prev) => [payload, ...prev]);
        showToast("Entidad pública registrada en la red metropolitana.");
      }
      setEntityModalOpen(false);
    } catch (err) {
      console.error("Error al guardar entidad:", err);
      showToast(err.message || "Error al procesar la entidad.", "error");
    }
  };

  const handleToggleEntityStatus = async (entity) => {
    const nuevoEstado = !entity.activa;
    try {
      await cambiarEstadoEntidad(entity.id, nuevoEstado).catch(() => null);
      setEntities((prev) =>
        prev.map((item) =>
          item.id === entity.id ? { ...item, activa: nuevoEstado } : item
        )
      );
      showToast(
        `La entidad ${entity.sigla || entity.nombre} fue ${nuevoEstado ? "habilitada" : "suspendida temporalmente"
        }.`
      );
    } catch (err) {
      console.error("Error al cambiar estado de entidad:", err);
      showToast("No se pudo actualizar el estado de la entidad.", "error");
    }
  };

  // Acciones: Usuarios
  const handleToggleUserStatus = async (target) => {
    const nuevoEstado = !target.activo;
    try {
      await cambiarEstadoUsuario(target.id, nuevoEstado).catch(() => null);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id ? { ...item, activo: nuevoEstado } : item
        )
      );
      showToast(
        `La cuenta de ${target.nombres} fue ${nuevoEstado ? "reactivada" : "suspendida"
        }.`
      );
    } catch (err) {
      console.error("Error al cambiar estado del usuario:", err);
      showToast("No se pudo modificar el estado del usuario.", "error");
    }
  };

  const handleOpenNotifyUser = (target) => {
    setTargetUser(target);
    setNotifyModalOpen(true);
  };

  const handleSendNotification = async (payload) => {
    if (!targetUser) return;
    try {
      await enviarNotificacionUsuario(targetUser.id, payload).catch(() => null);
      showToast(
        `Notificación emitida exitosamente a ${targetUser.nombres} ${targetUser.apellidos}.`
      );
      setNotifyModalOpen(false);
      setTargetUser(null);
    } catch (err) {
      console.error("Error al notificar al usuario:", err);
      showToast("No fue posible despachar la advertencia.", "error");
    }
  };

  const handleCreateOperator = async (payload) => {
    const nuevoOperador = await createOperador(payload);

    try {
      const [usuariosRes, metricasRes] = await Promise.allSettled([
        getUsuariosAdmin(),
        getMetricasAdmin(),
      ]);

      if (usuariosRes.status === "fulfilled" && Array.isArray(usuariosRes.value)) {
        setUsers(
          usuariosRes.value.map((u) => ({
            ...u,
            id: u.id || u._id,
            dni: u.dni || "00000000",
            nombres: u.nombres || u.name || "Usuario",
            apellidos: u.apellidos || "",
            email: u.email,
            rol: u.rol || u.role || "CIUDADANO",
            activo: u.activo ?? true,
            entidad_id: u.entidad_id,
            entidad_nombre: u.entidad_nombre,
            fiabilidad_pct:
              typeof u.fiabilidad_pct === "number"
                ? u.fiabilidad_pct
                : u.rol === "CIUDADANO"
                  ? 85
                  : null,
            total_reportes: u.total_reportes ?? 0,
          }))
        );
      } else if (nuevoOperador) {
        setUsers((prev) => [
          {
            ...nuevoOperador,
            id: nuevoOperador.id,
            dni: nuevoOperador.dni,
            nombres: nuevoOperador.nombres,
            apellidos: nuevoOperador.apellidos,
            email: nuevoOperador.email,
            rol: nuevoOperador.rol || "OPERADOR_ENTIDAD",
            activo: nuevoOperador.activo ?? true,
            entidad_id: nuevoOperador.entidad_id,
            entidad_nombre: nuevoOperador.entidad_nombre,
            fiabilidad_pct: null,
            total_reportes: 0,
          },
          ...prev,
        ]);
      }

      if (metricasRes.status === "fulfilled" && metricasRes.value) {
        setMetricas(metricasRes.value);
      } else {
        setMetricas((prev) =>
          prev
            ? { ...prev, total_operadores: (prev.total_operadores || 0) + 1 }
            : prev
        );
      }
    } catch (refreshErr) {
      console.warn("Advertencia al sincronizar tras crear operador:", refreshErr);
    }

    showToast("Operador técnico aprovisionado exitosamente.");
    setIsCreateOperatorOpen(false);
  };

  // Determinación de borde superior cromático para Usuarios
  const getUserTopBorder = (usr) => {
    if (usr.rol === "OPERADOR_ENTIDAD") {
      return "border-t-4 border-t-blue-500";
    }
    if (usr.rol === "SUPER_ADMIN") {
      return "border-t-4 border-t-purple-600";
    }
    const fiab = usr.fiabilidad_pct ?? 100;
    if (fiab >= 80) return "border-t-4 border-t-emerald-500";
    if (fiab >= 50) return "border-t-4 border-t-amber-500";
    return "border-t-4 border-t-red-500";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Toast Flotante */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${toast.type === "error"
            ? "bg-red-900 text-red-100 border-red-700"
            : "bg-slate-900 text-white border-slate-800"
            }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. NAVBAR INSTITUCIONAL CON DROPDOWN DE PERFIL 2FA         */}
      {/* ========================================================= */}
      <header className="bg-[#081D30] text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logotipo y Título Oficial */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Consola Central Metropolitana
                </h1>
                <span className="hidden sm:inline-flex rounded-full bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 border border-blue-700/50">
                  Superadmin
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-300">
                Supervisión operativa y gobernanza institucional
              </p>
            </div>
          </div>

          {/* Cluster de Perfil con Dropdown y Estado 2FA */}
          <div className="relative" ref={dropdownRef}>
            {/* Disparador del Dropdown */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-800/80 transition cursor-pointer focus:outline-hidden"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {/* Textos del Administrador */}
              <div className="hidden sm:block text-right text-xs leading-tight">
                <span className="block font-bold text-slate-100">
                  Administrador Central
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  admin@viaalerta.gob.pe
                </span>
              </div>

              {/* Avatar Circular con Iniciales "AC" y Semáforo 2FA */}
              <div
                title={
                  user?.dos_pasos_activo
                    ? "2FA Activo: cuenta protegida"
                    : "2FA Desactivado: cuenta vulnerable"
                }
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-xs shadow-xs transition-colors ${user?.dos_pasos_activo
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
                  }`}
              >
                <span>AC</span>

                {/* Ícono de Estado 2FA */}
                {user?.dos_pasos_activo ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-700 text-white border-2 border-[#081D30]"
                    title="2FA Activo: cuenta protegida"
                  >
                    <Check size={8} strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-3 w-3 rounded-full bg-red-400 border-2 border-[#081D30] animate-pulse"
                    title="2FA Desactivado: cuenta vulnerable"
                  />
                )}
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Menú Desplegable (Popover) */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl z-50 text-slate-800 animate-popover overflow-hidden">
                {/* Cabecera con datos del usuario y rol */}
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-900">
                    Administrador Central
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    admin@viaalerta.gob.pe
                  </p>
                </div>

                {/* Acciones */}
                <div className="p-1.5 space-y-0.5">
                  {/* Ítem 1: Seguridad / 2FA */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setSecurityModalForceSetup(false);
                      setIsSecurityModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-slate-500" />
                      <span>Seguridad / 2FA</span>
                    </div>
                    {user?.dos_pasos_activo ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        Inactivo
                      </span>
                    )}
                  </button>

                  {/* Separador */}
                  <div className="my-1 border-t border-slate-100" />

                  {/* Ítem 2: Cerrar Sesión */}
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

      {/* ========================================================= */}
      {/* CUERPO PRINCIPAL ALINEADO AL PÍXEL                         */}
      {/* ========================================================= */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* ========================================================= */}
        {/* TARJETAS KPI DE GOBERNANZA                                */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Entidades Registradas */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Entidades Registradas
              </span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                <Building2 size={16} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpiData.totalEntidades}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {kpiData.desglose}
            </p>
          </article>

          {/* Card 2: Operadores Activos */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Operadores Técnicos
              </span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Users size={16} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpiData.totalOperadores}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Cuentas técnicas institucionales
            </p>
          </article>

          {/* Card 3: Padrón Ciudadano */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Padrón Ciudadano
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <UserCheck size={16} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpiData.totalCiudadanos}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Vecinos metropolitanos habilitados
            </p>
          </article>

          {/* Card 4: Fiabilidad Global */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Fiabilidad Global
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                <Activity size={16} />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpiData.fiabilidadGlobal}%
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${kpiData.fiabilidadGlobal >= 80
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : kpiData.fiabilidadGlobal >= 50
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                  }`}
              >
                {kpiData.fiabilidadGlobal >= 80
                  ? "Salud Óptima"
                  : kpiData.fiabilidadGlobal >= 50
                    ? "Atención"
                    : "En Riesgo"}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Precisión de reportes vs. fiscalización
            </p>
          </article>
        </section>

        {/* ========================================================= */}
        {/* PESTAÑAS DE NAVEGACIÓN                                    */}
        {/* ========================================================= */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <nav className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("entidades")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition cursor-pointer ${activeTab === "entidades"
                ? "border-[#081D30] text-[#081D30] bg-white rounded-t-lg -mb-[1px]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Building2 size={16} />
              <span>Directorio de Entidades Públicas</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {entities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("usuarios")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition cursor-pointer ${activeTab === "usuarios"
                ? "border-[#081D30] text-[#081D30] bg-white rounded-t-lg -mb-[1px]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Users size={16} />
              <span>Padrón de Usuarios y Fiscalización</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {users.length}
              </span>
            </button>
          </nav>

          <div className="p-4 sm:p-6">
            {/* ===================================================== */}
            {/* MÓDULO DE ENTIDADES PÚBLICAS                          */}
            {/* ===================================================== */}
            {activeTab === "entidades" && (
              <div className="space-y-4">
                {/* Barra de Filtros y Acciones */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Buscador reactivo por nombre o RUC */}
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-2.5 text-slate-400"
                    />
                    <input
                      type="text"
                      value={queryEntities}
                      onChange={(e) => {
                        setQueryEntities(e.target.value);
                        setPageEntities(1);
                      }}
                      placeholder="Buscar entidad por razón social, sigla, RUC o competencia..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {/* Filtro por tipo y conmutador Cards/Tabla */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                      <Filter size={14} className="text-slate-400" />
                      <select
                        value={filterEntityType}
                        onChange={(e) => {
                          setFilterEntityType(e.target.value);
                          setPageEntities(1);
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="TODAS">Todas las Entidades</option>
                        <option value="MUNICIPALIDAD">Municipalidades (MML)</option>
                        <option value="EMPRESA_ESTATAL">Empresas Estatales (Sedapal)</option>
                      </select>
                    </div>

                    {/* Toggle Cards / Tabla */}
                    <div className="flex items-center rounded-xl border border-slate-300 bg-slate-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewEntities("cards")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${viewEntities === "cards"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                          }`}
                        title="Vista en Tarjetas"
                      >
                        <LayoutGrid size={14} />
                        <span>Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewEntities("table")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${viewEntities === "table"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                          }`}
                        title="Vista en Tabla"
                      >
                        <TableIcon size={14} />
                        <span>Tabla</span>
                      </button>
                    </div>

                    {/* Botón Primario Registrar Entidad */}
                    <button
                      type="button"
                      onClick={handleOpenCreateEntity}
                      className="flex items-center gap-1.5 rounded-xl bg-[#081D30] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Registrar Entidad Pública</span>
                    </button>
                  </div>
                </div>

                {/* Vista Cards / Grid de Entidades (Borde Superior Cromático) */}
                {viewEntities === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-[#081D30]" />
                        Sincronizando entidades metropolitanas...
                      </div>
                    ) : paginatedEntities.length ? (
                      paginatedEntities.map((ent) => {
                        const isMuni =
                          ent.tipo === "MUNICIPALIDAD" ||
                          (ent.sigla || "").toUpperCase().includes("MML");

                        return (
                          <article
                            key={ent.id}
                            className={`flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-sm ${isMuni
                              ? "border-t-4 border-t-amber-500"
                              : "border-t-4 border-t-sky-500"
                              }`}
                          >
                            <div className="space-y-3">
                              {/* Header Card */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-bold border ${isMuni
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-sky-50 text-sky-800 border-sky-200"
                                        }`}
                                    >
                                      {ent.sigla || "ENT"}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${isMuni
                                        ? "bg-amber-50/70 text-amber-700 border-amber-200/60"
                                        : "bg-sky-50/70 text-sky-700 border-sky-200/60"
                                        }`}
                                    >
                                      {isMuni ? "Municipalidad" : "Empresa Estatal"}
                                    </span>
                                  </div>
                                  <h3 className="mt-1.5 text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                    {ent.nombre_oficial || ent.nombre || "Sin denominación"}
                                  </h3>
                                </div>

                                {/* Estado Activa / Inactiva */}
                                <span
                                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${ent.activa
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-300"
                                    }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${ent.activa ? "bg-emerald-500" : "bg-slate-400"
                                      }`}
                                  />
                                  {ent.activa ? "Activa" : "Inactiva"}
                                </span>
                              </div>

                              {/* Datos Institucionales */}
                              <div className="space-y-1.5 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                                  <span className="font-semibold text-slate-700">RUC:</span>
                                  <span>{ent.ruc || "No registrado"}</span>
                                </div>

                                <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                                  <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                                  <span className="line-clamp-2">
                                    {ent.jurisdiccion || "Sin jurisdicción asignada"}
                                  </span>
                                </div>

                                {/* Coordenadas si existen */}
                                {(ent.latitud && ent.longitud) && (
                                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600 bg-slate-100/90 px-2 py-1 rounded-md border border-slate-200">
                                    <span className="font-bold text-slate-700">Coord:</span>
                                    <span>Lat: {ent.latitud}, Lng: {ent.longitud}</span>
                                  </div>
                                )}
                              </div>

                              {/* Contacto */}
                              <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 space-y-1 font-mono border border-slate-100">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    {ent.email_despacho || ent.email_contacto || ent.email || "No asignado"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Phone size={12} className="text-slate-400 shrink-0" />
                                  <span>
                                    {ent.telefono || ent.central_telefonica || "No registrado"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Acciones Rápidas */}
                            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <button
                                type="button"
                                onClick={() => handleOpenEditEntity(ent)}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                              >
                                <Pencil size={13} />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleEntityStatus(ent)}
                                className={`flex-1 flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${ent.activa
                                  ? "border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50"
                                  : "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50"
                                  }`}
                              >
                                <Power size={13} />
                                <span>{ent.activa ? "Desactivar" : "Habilitar"}</span>
                              </button>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-12 text-center text-slate-400">
                        <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                        No se encontraron entidades públicas adscritas.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Vista Tabla de Entidades */
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[800px] text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <tr>
                          <th className="px-4 py-3">RUC</th>
                          <th className="px-4 py-3">Entidad / Sigla</th>
                          <th className="px-4 py-3">Tipo Institucional</th>
                          <th className="px-4 py-3">Jurisdicción / Despacho</th>
                          <th className="px-4 py-3">Contacto</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {isLoading ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-500">
                              <Loader2 size={24} className="mx-auto mb-2 animate-spin text-[#081D30]" />
                              Cargando registros...
                            </td>
                          </tr>
                        ) : paginatedEntities.length ? (
                          paginatedEntities.map((ent) => {
                            const isMuni =
                              ent.tipo === "MUNICIPALIDAD" ||
                              (ent.sigla || "").toUpperCase().includes("MML");

                            return (
                              <tr key={ent.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                  {ent.ruc || "No registrado"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border ${isMuni
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-sky-50 text-sky-800 border-sky-200"
                                        }`}
                                    >
                                      {ent.sigla || "ENT"}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {ent.nombre_oficial || ent.nombre || "Sin denominación"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${isMuni
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-sky-50 text-sky-800 border-sky-200"
                                      }`}
                                  >
                                    {isMuni ? "Municipalidad" : "Empresa Estatal"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                                  {ent.jurisdiccion || "Sin jurisdicción asignada"}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                  <p>{ent.email_despacho || ent.email_contacto || ent.email || "No asignado"}</p>
                                  <p>{ent.telefono || ent.central_telefonica || "No registrado"}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${ent.activa
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border-slate-300"
                                      }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${ent.activa ? "bg-emerald-500" : "bg-slate-400"
                                        }`}
                                    />
                                    {ent.activa ? "Activa" : "Inactiva"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditEntity(ent)}
                                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                                      title="Editar datos de entidad"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleEntityStatus(ent)}
                                      className={`rounded p-1 transition ${ent.activa
                                        ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
                                        : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                        }`}
                                      title={ent.activa ? "Desactivar entidad" : "Habilitar entidad"}
                                    >
                                      <Power size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                              <FileText size={24} className="mx-auto mb-1 text-slate-300" />
                              No hay registros que coincidan con la búsqueda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Paginación Entidades */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  <span>
                    Mostrando {filteredEntities.length ? (pageEntities - 1) * PAGE_SIZE + 1 : 0}{" "}
                    a {Math.min(pageEntities * PAGE_SIZE, filteredEntities.length)} de{" "}
                    {filteredEntities.length} entidades
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      Página {pageEntities} de {totalEntityPages}
                    </span>
                    <button
                      type="button"
                      disabled={pageEntities <= 1}
                      onClick={() => setPageEntities((p) => p - 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={pageEntities >= totalEntityPages}
                      onClick={() => setPageEntities((p) => p + 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Siguiente
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* MÓDULO DE PADRÓN DE USUARIOS Y FISCALIZACIÓN          */}
            {/* ===================================================== */}
            {activeTab === "usuarios" && (
              <div className="space-y-4">
                {/* Barra de Filtros de Usuarios */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Buscador reactivo por DNI, nombres o correo */}
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-2.5 text-slate-400"
                    />
                    <input
                      type="text"
                      value={queryUsers}
                      onChange={(e) => {
                        setQueryUsers(e.target.value);
                        setPageUsers(1);
                      }}
                      placeholder="Buscar por DNI, nombres, apellidos o correo electrónico..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {/* Filtro por rol y conmutador Cards/Tabla */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCreateOperatorOpen(true)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#081D30] px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                    >
                      <UserPlus size={15} />
                      <span>+ Crear Operador Técnico</span>
                    </button>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                      <Filter size={14} className="text-slate-400" />
                      <select
                        value={filterUserRole}
                        onChange={(e) => {
                          setFilterUserRole(e.target.value);
                          setPageUsers(1);
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="TODOS">Todos los Roles</option>
                        <option value="CIUDADANO">Ciudadanos</option>
                        <option value="OPERADOR_ENTIDAD">Operadores Institucionales</option>
                        <option value="SUPER_ADMIN">Super Administradores</option>
                      </select>
                    </div>

                    {/* Toggle Cards / Tabla */}
                    <div className="flex items-center rounded-xl border border-slate-300 bg-slate-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewUsers("cards")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${viewUsers === "cards"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                          }`}
                        title="Vista en Tarjetas"
                      >
                        <LayoutGrid size={14} />
                        <span>Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewUsers("table")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${viewUsers === "table"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                          }`}
                        title="Vista en Tabla"
                      >
                        <TableIcon size={14} />
                        <span>Tabla</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vista Cards / Grid de Usuarios (Borde Superior Cromático) */}
                {viewUsers === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-[#081D30]" />
                        Sincronizando padrón de usuarios y fiscalización...
                      </div>
                    ) : paginatedUsers.length ? (
                      paginatedUsers.map((usr) => {
                        const isCitizen = usr.rol === "CIUDADANO";
                        const fiab = usr.fiabilidad_pct ?? 100;

                        return (
                          <article
                            key={usr.id}
                            className={`flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-sm ${getUserTopBorder(
                              usr
                            )}`}
                          >
                            <div className="space-y-3">
                              {/* Header Card Usuario */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                                    {(usr.nombres?.[0] || "U").toUpperCase()}
                                  </div>
                                  <div>
                                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                                      {usr.nombres} {usr.apellidos}
                                    </h3>
                                    <span className="font-mono text-[11px] text-slate-500">
                                      DNI {usr.dni}
                                    </span>
                                  </div>
                                </div>

                                {/* Estado Activo / Suspendido */}
                                <span
                                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${usr.activo
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                    }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${usr.activo ? "bg-emerald-500" : "bg-red-500"
                                      }`}
                                  />
                                  {usr.activo ? "Activo" : "Suspendido"}
                                </span>
                              </div>

                              {/* Correo y Rol */}
                              <div className="space-y-1 text-xs text-slate-600">
                                <p className="font-mono text-[11px] text-slate-500 truncate">
                                  {usr.email}
                                </p>
                                <div className="pt-0.5">
                                  {usr.rol === "CIUDADANO" ? (
                                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                      Ciudadano Vecinal
                                    </span>
                                  ) : usr.rol === "OPERADOR_ENTIDAD" ? (
                                    <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                      Operador Institucional
                                    </span>
                                  ) : (
                                    <span className="inline-block rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                                      Super Administrador
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Indicador de Fiabilidad Ciudadana */}
                              {isCitizen ? (
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-600 text-[11px]">
                                      Fiabilidad Ciudadana:
                                    </span>
                                    <span
                                      className={`font-mono text-xs font-bold ${fiab >= 80
                                        ? "text-emerald-700"
                                        : fiab >= 50
                                          ? "text-amber-700"
                                          : "text-red-700"
                                        }`}
                                    >
                                      {fiab}%
                                    </span>
                                  </div>

                                  {/* Barra de progreso visual */}
                                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 ${fiab >= 80
                                        ? "bg-emerald-500"
                                        : fiab >= 50
                                          ? "bg-amber-500"
                                          : "bg-red-500"
                                        }`}
                                      style={{ width: `${Math.min(100, Math.max(5, fiab))}%` }}
                                    />
                                  </div>

                                  {/* Etiqueta semántica */}
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span
                                      className={`font-bold ${fiab >= 80
                                        ? "text-emerald-700"
                                        : fiab >= 50
                                          ? "text-amber-700"
                                          : "text-red-700"
                                        }`}
                                    >
                                      {fiab >= 80
                                        ? "Alta fiabilidad"
                                        : fiab >= 50
                                          ? "Atención / Reportes desestimados"
                                          : "Baja fiabilidad / Posible reincidencia"}
                                    </span>
                                    <span className="text-slate-400">
                                      {usr.total_reportes} reportes
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
                                  <span className="text-[11px] text-slate-500 block">
                                    Adscripción de Seguridad:
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {usr.entidad_nombre || "Gobierno Central Metropolitano"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Acciones Administrativas según Matriz de Roles */}
                            <div className="mt-4 border-t border-slate-100 pt-3">
                              {usr.rol === "SUPER_ADMIN" ? (
                                <div className="w-full text-center py-2 px-2.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
                                  <span>Cuenta Raíz Metropolitana (No mutable)</span>
                                </div>
                              ) : usr.rol === "OPERADOR_ENTIDAD" ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(usr)}
                                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${usr.activo
                                    ? "border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50"
                                    : "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50"
                                    }`}
                                >
                                  {usr.activo ? (
                                    <>
                                      <UserX size={13} />
                                      <span>Suspender</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck size={13} />
                                      <span>Reactivar</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNotifyUser(usr)}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                  >
                                    <Bell size={13} className="text-amber-500" />
                                    <span>Notificar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(usr)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${usr.activo
                                      ? "border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50"
                                      : "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50"
                                      }`}
                                  >
                                    {usr.activo ? (
                                      <>
                                        <UserX size={13} />
                                        <span>Suspender</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck size={13} />
                                        <span>Reactivar</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-12 text-center text-slate-400">
                        <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                        No se encontraron usuarios en el padrón con los criterios especificados.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Vista Tabla de Usuarios */
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[850px] text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <tr>
                          <th className="px-4 py-3">DNI</th>
                          <th className="px-4 py-3">Nombres y Apellidos</th>
                          <th className="px-4 py-3">Correo Electrónico</th>
                          <th className="px-4 py-3">Rol Institucional</th>
                          <th className="px-4 py-3">Fiabilidad Ciudadana</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {isLoading ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-500">
                              <Loader2 size={24} className="mx-auto mb-2 animate-spin text-[#081D30]" />
                              Cargando padrón...
                            </td>
                          </tr>
                        ) : paginatedUsers.length ? (
                          paginatedUsers.map((usr) => {
                            const isCitizen = usr.rol === "CIUDADANO";
                            const fiab = usr.fiabilidad_pct ?? 100;

                            return (
                              <tr key={usr.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                  {usr.dni}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-900">
                                  {usr.nombres} {usr.apellidos}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                  {usr.email}
                                </td>
                                <td className="px-4 py-3">
                                  {usr.rol === "CIUDADANO" ? (
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                      Ciudadano
                                    </span>
                                  ) : usr.rol === "OPERADOR_ENTIDAD" ? (
                                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                      Operador
                                    </span>
                                  ) : (
                                    <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                                      Super Admin
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isCitizen ? (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`font-mono text-xs font-bold ${fiab >= 80
                                          ? "text-emerald-700"
                                          : fiab >= 50
                                            ? "text-amber-700"
                                            : "text-red-700"
                                          }`}
                                      >
                                        {fiab}%
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${fiab >= 80
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : fiab >= 50
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                          }`}
                                      >
                                        {fiab >= 80
                                          ? "Alta"
                                          : fiab >= 50
                                            ? "Atención"
                                            : "Baja"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Institucional
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${usr.activo
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${usr.activo ? "bg-emerald-500" : "bg-red-500"
                                        }`}
                                    />
                                    {usr.activo ? "Activo" : "Suspendido"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {usr.rol === "SUPER_ADMIN" ? (
                                    <span className="text-[10px] text-slate-400 font-semibold">No mutable</span>
                                  ) : usr.rol === "OPERADOR_ENTIDAD" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserStatus(usr)}
                                      className={`rounded p-1 transition ${usr.activo
                                        ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
                                        : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                        }`}
                                      title={usr.activo ? "Suspender cuenta" : "Reactivar cuenta"}
                                    >
                                      {usr.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                                    </button>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenNotifyUser(usr)}
                                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition"
                                        title="Enviar advertencia"
                                      >
                                        <Bell size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleUserStatus(usr)}
                                        className={`rounded p-1 transition ${usr.activo
                                          ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
                                          : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                          }`}
                                        title={usr.activo ? "Suspender cuenta" : "Reactivar cuenta"}
                                      >
                                        {usr.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                              <FileText size={24} className="mx-auto mb-1 text-slate-300" />
                              No hay usuarios coincidentes.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Paginación Usuarios */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  <span>
                    Mostrando {filteredUsers.length ? (pageUsers - 1) * PAGE_SIZE + 1 : 0} a{" "}
                    {Math.min(pageUsers * PAGE_SIZE, filteredUsers.length)} de{" "}
                    {filteredUsers.length} usuarios
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      Página {pageUsers} de {totalUserPages}
                    </span>
                    <button
                      type="button"
                      disabled={pageUsers <= 1}
                      onClick={() => setPageUsers((p) => p - 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={pageUsers >= totalUserPages}
                      onClick={() => setPageUsers((p) => p + 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Siguiente
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: REGISTRAR / EDITAR ENTIDAD PÚBLICA               */}
      {/* ========================================================= */}
      {entityModalOpen && (
        <EntityFormModal
          isOpen={entityModalOpen}
          initialData={editingEntity}
          onClose={() => setEntityModalOpen(false)}
          onSave={handleSaveEntity}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: NOTIFICACIÓN / ADVERTENCIA A USUARIO             */}
      {/* ========================================================= */}
      {notifyModalOpen && targetUser && (
        <NotificationModal
          isOpen={notifyModalOpen}
          user={targetUser}
          onClose={() => {
            setNotifyModalOpen(false);
            setTargetUser(null);
          }}
          onSend={handleSendNotification}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3: SEGURIDAD 2FA (TOTP)                             */}
      {/* ========================================================= */}
      <Security2FAModal
        isOpen={isSecurityModalOpen}
        forceSetup={securityModalForceSetup}
        onClose={() => {
          setIsSecurityModalOpen(false);
          setSecurityModalForceSetup(false);
        }}
        onSuccess={() => {
          showToast("Configuración de seguridad 2FA actualizada correctamente.");
        }}
      />

      {/* ========================================================= */}
      {/* MODAL 4: CREACIÓN DE OPERADOR TÉCNICO                     */}
      {/* ========================================================= */}
      {isCreateOperatorOpen && (
        <CreateOperatorModal
          isOpen={isCreateOperatorOpen}
          entities={entities}
          onClose={() => setIsCreateOperatorOpen(false)}
          onSave={handleCreateOperator}
        />
      )}
    </div>
  );
};

/**
 * Modal de Creación / Edición de Entidad Pública con validaciones estrictas.
 */
const EntityFormModal = ({ isOpen, initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre_oficial || initialData?.nombre || initialData?.name || "",
    sigla: initialData?.sigla || initialData?.acronym || "",
    ruc: initialData?.ruc || "",
    tipo: initialData?.tipo || "MUNICIPALIDAD",
    jurisdiccion: initialData?.jurisdiccion || initialData?.jurisdiccion_competencia || initialData?.jurisdiction || "",
    email: initialData?.email_despacho || initialData?.email || initialData?.correo_despacho || "",
    telefono: initialData?.telefono || initialData?.central_telefonica || initialData?.telefono_emergencia || initialData?.phone || "",
    latitud: initialData?.latitud || "",
    longitud: initialData?.longitud || "",
  });

  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [obteniendoGps, setObteniendoGps] = useState(false);

  const handleObtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert("No se pudo obtener la geolocalización: El navegador no soporta geolocalización.");
      return;
    }
    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitud: pos.coords.latitude.toFixed(6),
          longitud: pos.coords.longitude.toFixed(6),
        }));
        setObteniendoGps(false);
      },
      (err) => {
        setObteniendoGps(false);
        alert("No se pudo obtener la geolocalización: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reglas de validación estrictas
  const errors = useMemo(() => {
    const errs = {};

    // nombre_oficial: Mínimo 5 caracteres
    if (!formData.nombre.trim()) {
      errs.nombre = "La razón social o nombre oficial es obligatoria.";
    } else if (formData.nombre.trim().length < 5) {
      errs.nombre = "El nombre oficial debe contener al menos 5 caracteres.";
    }

    // sigla: Mínimo 2 caracteres
    if (!formData.sigla.trim()) {
      errs.sigla = "La sigla es obligatoria.";
    } else if (formData.sigla.trim().length < 2) {
      errs.sigla = "La sigla debe contener al menos 2 caracteres.";
    }

    // ruc: Exactamente 11 dígitos numéricos
    if (!formData.ruc.trim()) {
      errs.ruc = "El RUC institucional es obligatorio.";
    } else if (!/^\d{11}$/.test(formData.ruc.trim())) {
      errs.ruc = "El RUC debe contar con exactamente 11 dígitos numéricos.";
    }

    // jurisdiccion: Mínimo 3 caracteres
    if (!formData.jurisdiccion.trim()) {
      errs.jurisdiccion = "La jurisdicción o competencia técnica es obligatoria.";
    } else if (formData.jurisdiccion.trim().length < 3) {
      errs.jurisdiccion = "La jurisdicción debe contener al menos 3 caracteres.";
    }

    // email_contacto: Si se ingresa, validar formato de correo electrónico
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      errs.email = "Ingrese un correo electrónico de despacho válido.";
    }

    return errs;
  }, [formData]);

  const isFormValid = Object.keys(errors).length === 0;

  if (!isOpen) return null;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      nombre: true,
      sigla: true,
      ruc: true,
      jurisdiccion: true,
      email: true,
      telefono: true,
    });

    if (!isFormValid) {
      setSubmitError("Por favor corrija los campos observados antes de continuar.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      await onSave(formData);
    } catch (err) {
      setSubmitError(err.message || "Error al procesar la entidad pública.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#081D30] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600/30 p-2 text-blue-400 border border-blue-500/30">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                {initialData ? "Editar Entidad Pública" : "Registrar Entidad Pública"}
              </h2>
              <p className="text-[11px] text-slate-300">
                Gobernanza y asignación operativa en Lima Metropolitana
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
              <AlertTriangle size={15} className="shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Nombre Oficial */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Razón Social / Nombre Oficial *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onBlur={() => handleBlur("nombre")}
              onChange={(e) => {
                setFormData({ ...formData, nombre: e.target.value });
                if (touched.nombre) setSubmitError("");
              }}
              placeholder="Ej. Municipalidad Metropolitana de Lima"
              className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${touched.nombre && errors.nombre
                ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
            />
            {touched.nombre && errors.nombre && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                {errors.nombre}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sigla */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sigla / Acrónimo *
              </label>
              <input
                type="text"
                required
                value={formData.sigla}
                onBlur={() => handleBlur("sigla")}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    sigla: e.target.value.toUpperCase(),
                  });
                  if (touched.sigla) setSubmitError("");
                }}
                placeholder="Ej. MML, SEDAPAL"
                className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-bold text-slate-800 outline-none uppercase transition focus:ring-1 ${touched.sigla && errors.sigla
                  ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                  }`}
              />
              {touched.sigla && errors.sigla && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {errors.sigla}
                </p>
              )}
            </div>

            {/* RUC (11 dígitos numéricos estrictos) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                RUC Oficial (11 dígitos) *
              </label>
              <input
                type="text"
                required
                maxLength={11}
                inputMode="numeric"
                value={formData.ruc}
                onBlur={() => handleBlur("ruc")}
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setFormData({ ...formData, ruc: numOnly });
                  if (touched.ruc) setSubmitError("");
                }}
                placeholder="20131380951"
                className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-bold text-slate-800 outline-none transition focus:ring-1 ${touched.ruc && errors.ruc
                  ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                  }`}
              />
              {touched.ruc && errors.ruc && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {errors.ruc}
                </p>
              )}
            </div>
          </div>

          {/* Tipo Institucional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo Institucional *
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              <option value="MUNICIPALIDAD">Municipalidad (Gobierno Local / MML)</option>
              <option value="EMPRESA_ESTATAL">Empresa Estatal / Servicio de Saneamiento</option>
            </select>
          </div>

          {/* Jurisdicción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Jurisdicción y Competencia Técnica *
            </label>
            <input
              type="text"
              required
              value={formData.jurisdiccion}
              onBlur={() => handleBlur("jurisdiccion")}
              onChange={(e) => {
                setFormData({ ...formData, jurisdiccion: e.target.value });
                if (touched.jurisdiccion) setSubmitError("");
              }}
              placeholder="Ej. Vías Metropolitanas, Cercado de Lima, etc."
              className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${touched.jurisdiccion && errors.jurisdiccion
                ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
            />
            {touched.jurisdiccion && errors.jurisdiccion && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                {errors.jurisdiccion}
              </p>
            )}
          </div>

          {/* Contacto: Email y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Institucional de Despacho
              </label>
              <input
                type="email"
                value={formData.email}
                onBlur={() => handleBlur("email")}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (touched.email) setSubmitError("");
                }}
                placeholder="operaciones@entidad.gob.pe"
                className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${touched.email && errors.email
                  ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                  }`}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Central de Emergencias / Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="(01) 632-1300"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Campos de Geolocalización Institucional */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-600" />
                <span>Geolocalización Institucional</span>
              </label>
              <button
                type="button"
                onClick={handleObtenerUbicacion}
                disabled={obteniendoGps}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#081D30] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {obteniendoGps ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <MapPin size={14} className="text-amber-400" />
                )}
                <span>Capturar Coordenadas GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Latitud
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.latitud}
                  placeholder="-12.046374"
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 cursor-not-allowed outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Longitud
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.longitud}
                  placeholder="-77.042793"
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700 cursor-not-allowed outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Botones con bloqueo estricto si el formulario no es válido */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-[#081D30] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{initialData ? "Guardar Cambios" : "Registrar Entidad"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


/**
 * Modal de Advertencia / Notificación a Usuarios con validaciones estrictas.
 */
const NotificationModal = ({ isOpen, user, onClose, onSend }) => {
  const [selectedTemplate, setSelectedTemplate] = useState("desestimados");
  const [titulo, setTitulo] = useState(NOTIFICATION_TEMPLATES[0].titulo);
  const [mensaje, setMensaje] = useState(NOTIFICATION_TEMPLATES[0].mensaje);
  const [tipo, setTipo] = useState(NOTIFICATION_TEMPLATES[0].tipo);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Validaciones: titulo >= 4 caracteres y mensaje >= 10 caracteres
  const isTituloValid = titulo.trim().length >= 4;
  const isMensajeValid = mensaje.trim().length >= 10;
  const isNotificationValid = isTituloValid && isMensajeValid;

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
    setTitulo(tpl.titulo);
    setMensaje(tpl.mensaje);
    setTipo(tpl.tipo);
    setError("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setTouched({ titulo: true, mensaje: true });

    if (!isNotificationValid) {
      setError("Complete un título de al menos 4 caracteres y un mensaje explicativo de al menos 10 caracteres.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onSend({ titulo: titulo.trim(), mensaje: mensaje.trim(), tipo });
    } catch (err) {
      setError(err.message || "Error al remitir la notificación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#081D30] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-500/30 p-2 text-amber-400 border border-amber-500/30">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Emitir Notificación / Advertencia
              </h2>
              <p className="text-[11px] text-slate-300">
                Fiscalización metropolitana de reportes ciudadanos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {/* Ficha Destinatario */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Destinatario
              </span>
              <strong className="text-slate-800 text-xs">
                {user.nombres} {user.apellidos}
              </strong>
              <span className="block text-[11px] font-mono text-slate-500">
                DNI {user.dni} · {user.email}
              </span>
            </div>
            {typeof user.fiabilidad_pct === "number" && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Fiabilidad
                </span>
                <span
                  className={`font-mono text-sm font-bold ${user.fiabilidad_pct >= 80
                    ? "text-emerald-700"
                    : user.fiabilidad_pct >= 50
                      ? "text-amber-700"
                      : "text-red-700"
                    }`}
                >
                  {user.fiabilidad_pct}%
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
              <AlertTriangle size={15} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Plantillas Rápidas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Plantillas Rápidas de Fiscalización:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NOTIFICATION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`text-left rounded-xl p-2.5 text-xs font-semibold border transition cursor-pointer ${selectedTemplate === tpl.id
                    ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  <span className="block truncate font-bold">{tpl.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {tpl.tipo === "URGENTE"
                      ? "Urgente / Preventivo"
                      : tpl.tipo === "ADVERTENCIA"
                        ? "Advertencia formal"
                        : "Informativo"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Notificación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nivel de Severidad:
            </label>
            <div className="flex gap-2">
              {[
                ["INFORMATIVO", "Informativo", "text-blue-700 border-blue-200 bg-blue-50"],
                ["ADVERTENCIA", "Advertencia", "text-amber-800 border-amber-300 bg-amber-50"],
                ["URGENTE", "Urgente", "text-red-700 border-red-300 bg-red-50"],
              ].map(([val, lbl, style]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTipo(val)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition cursor-pointer ${tipo === val
                    ? `${style} ring-1 ring-offset-1 ring-blue-500`
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Asunto (Validación mínima 4 caracteres) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Asunto / Título *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onBlur={() => setTouched((p) => ({ ...p, titulo: true }))}
              onChange={(e) => {
                setTitulo(e.target.value);
                if (error) setError("");
              }}
              placeholder="Asunto de la notificación (mínimo 4 caracteres)"
              className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${touched.titulo && !isTituloValid
                ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
            />
            {touched.titulo && !isTituloValid && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                El título debe contener al menos 4 caracteres.
              </p>
            )}
          </div>

          {/* Mensaje (Validación mínima 10 caracteres) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cuerpo del Mensaje *
            </label>
            <textarea
              required
              rows={4}
              value={mensaje}
              onBlur={() => setTouched((p) => ({ ...p, mensaje: true }))}
              onChange={(e) => {
                setMensaje(e.target.value);
                if (error) setError("");
              }}
              placeholder="Escriba los detalles de la notificación institucional (mínimo 10 caracteres)..."
              className={`w-full rounded-xl border p-3 text-xs text-slate-800 outline-none leading-relaxed resize-none transition focus:ring-1 ${touched.mensaje && !isMensajeValid
                ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
            />
            {touched.mensaje && !isMensajeValid && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                El mensaje debe contener al menos 10 caracteres explicativos.
              </p>
            )}
          </div>

          {/* Acciones con bloqueo de botón estricto */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isNotificationValid || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-[#081D30] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Emitir Notificación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Modal de Creación de Operador Técnico con diseño B2B sobrio y validaciones institucionales.
 */
const CreateOperatorModal = ({ isOpen, entities, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    dni: "",
    email: "",
    password: "",
    entidad_id: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const resetForm = () => {
    setFormData({
      nombres: "",
      apellidos: "",
      dni: "",
      email: "",
      password: "",
      entidad_id: "",
    });
    setTouched({});
    setSubmitError("");
    setShowPassword(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const errors = useMemo(() => {
    const errs = {};

    if (!formData.nombres.trim()) {
      errs.nombres = "Los nombres son obligatorios.";
    } else if (formData.nombres.trim().length < 2) {
      errs.nombres = "Debe ingresar al menos 2 caracteres.";
    }

    if (!formData.apellidos.trim()) {
      errs.apellidos = "Los apellidos son obligatorios.";
    } else if (formData.apellidos.trim().length < 2) {
      errs.apellidos = "Debe ingresar al menos 2 caracteres.";
    }

    if (!formData.dni.trim()) {
      errs.dni = "El DNI institucional es obligatorio.";
    } else if (!/^\d{8}$/.test(formData.dni.trim())) {
      errs.dni = "El DNI debe contener exactamente 8 dígitos numéricos.";
    }

    if (!formData.email.trim()) {
      errs.email = "El correo institucional es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Ingrese un correo institucional válido.";
    }

    if (!formData.password) {
      errs.password = "La contraseña temporal es obligatoria.";
    } else if (formData.password.length < 6) {
      errs.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!formData.entidad_id) {
      errs.entidad_id = "Debe seleccionar una entidad pública adscrita.";
    }

    return errs;
  }, [formData]);

  const hasEntities = Array.isArray(entities) && entities.length > 0;
  const isFormValid = Object.keys(errors).length === 0 && hasEntities;

  if (!isOpen) return null;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      nombres: true,
      apellidos: true,
      dni: true,
      email: true,
      password: true,
      entidad_id: true,
    });

    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const parsedEntidadId = isNaN(Number(formData.entidad_id))
        ? formData.entidad_id
        : Number(formData.entidad_id);

      await onSave({
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        dni: formData.dni.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        entidad_id: parsedEntidadId,
      });

      resetForm();
    } catch (err) {
      const msg =
        err?.message ||
        err?.data?.error ||
        err?.data?.mensaje ||
        "Ocurrió un error al intentar aprovisionar el operador técnico.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Cabecera B2B */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#081D30] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600/30 p-2 text-blue-400 border border-blue-500/30">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Aprovisionamiento de Operador Técnico
              </h2>
              <p className="text-[11px] text-slate-300">
                Asignación de credenciales operativas e interoperabilidad institucional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {!hasEntities && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <span>
                No existen entidades públicas registradas en el sistema. Registre una entidad adscrita antes de aprovisionar un operador técnico.
              </span>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
              <AlertTriangle size={15} className="shrink-0 text-red-600 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombres *
              </label>
              <input
                type="text"
                required
                value={formData.nombres}
                onBlur={() => handleBlur("nombres")}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, nombres: e.target.value }));
                  if (touched.nombres) setSubmitError("");
                }}
                placeholder="Ej. Carlos Alberto"
                className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${
                  touched.nombres && errors.nombres
                    ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
              />
              {touched.nombres && errors.nombres && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {errors.nombres}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                required
                value={formData.apellidos}
                onBlur={() => handleBlur("apellidos")}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, apellidos: e.target.value }));
                  if (touched.apellidos) setSubmitError("");
                }}
                placeholder="Ej. Mendoza Ramos"
                className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${
                  touched.apellidos && errors.apellidos
                    ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
              />
              {touched.apellidos && errors.apellidos && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {errors.apellidos}
                </p>
              )}
            </div>
          </div>

          {/* DNI Institucional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              DNI (8 dígitos) *
            </label>
            <input
              type="text"
              required
              maxLength={8}
              inputMode="numeric"
              value={formData.dni}
              onBlur={() => handleBlur("dni")}
              onChange={(e) => {
                const numOnly = e.target.value.replace(/\D/g, "").slice(0, 8);
                setFormData((prev) => ({ ...prev, dni: numOnly }));
                if (touched.dni) setSubmitError("");
              }}
              placeholder="Ej. 45678901"
              className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-bold text-slate-800 outline-none transition focus:ring-1 ${
                touched.dni && errors.dni
                  ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
              }`}
            />
            {touched.dni && errors.dni && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                {errors.dni}
              </p>
            )}
          </div>

          {/* Correo Institucional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Correo Institucional *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onBlur={() => handleBlur("email")}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                if (touched.email) setSubmitError("");
              }}
              placeholder="operaciones.miraflores@munimiraflores.gob.pe"
              className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:ring-1 ${
                touched.email && errors.email
                  ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
              }`}
            />
            {touched.email && errors.email && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          {/* Contraseña Temporal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contraseña Temporal (mínimo 6 caracteres) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onBlur={() => handleBlur("password")}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, password: e.target.value }));
                  if (touched.password) setSubmitError("");
                }}
                placeholder="••••••••"
                className={`w-full rounded-xl border py-2 pl-3.5 pr-10 text-xs text-slate-800 outline-none transition focus:ring-1 ${
                  touched.password && errors.password
                    ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          {/* Entidad Pública Asignada */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Entidad Pública Asignada *
            </label>
            <div className="relative">
              <select
                required
                disabled={!hasEntities}
                value={formData.entidad_id}
                onBlur={() => handleBlur("entidad_id")}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, entidad_id: e.target.value }));
                  if (touched.entidad_id) setSubmitError("");
                }}
                className={`w-full appearance-none rounded-xl border py-2 pl-3.5 pr-9 text-xs text-slate-800 outline-none transition focus:ring-1 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed ${
                  touched.entidad_id && errors.entidad_id
                    ? "border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600"
                }`}
              >
                <option value="">-- Seleccione una entidad adscrita --</option>
                {entities.map((ent) => {
                  const idVal = ent.id ?? ent._id;
                  const sigla = ent.sigla || ent.acronym || "ENT";
                  const nombre = ent.nombre_oficial || ent.nombre || ent.name || "Entidad Pública";
                  const isActiva = ent.activa !== false;
                  return (
                    <option key={idVal} value={idVal} disabled={!isActiva}>
                      {sigla} - {nombre} {!isActiva ? "(Inactiva)" : ""}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
            {touched.entidad_id && errors.entidad_id && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                {errors.entidad_id}
              </p>
            )}
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="flex items-center gap-2 rounded-xl bg-[#081D30] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Aprovisionando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Aprovisionar Operador</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
