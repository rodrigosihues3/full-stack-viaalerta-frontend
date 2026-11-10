import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Compass,
  Cone,
  Droplets,
  FileText,
  HelpCircle,
  Home,
  Image,
  Layers,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  X,
} from "lucide-react";
import { Security2FAModal } from "../components/Security2FAModal";
import { NotificationPanel } from "../components/NotificationPanel";
import { RoadMonitorMap } from "../components/RoadMonitorMap";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUS,
  ENTITIES,
} from "../services/mockData";
import {
  getIncidentes,
  getIncidentesCercanos,
  getIncidenteById,
  createIncidente,
  confirmarIncidente,
  normalizeIncidente,
} from "../services/incidentService";
import {
  getNotificaciones,
  markNotificacionAsRead,
  markAllNotificacionesAsRead,
  normalizeNotificacion,
  formatNotificationDate,
} from "../services/notificationService";
import { getUserInitials } from "../services/authServices";
import { getSocket } from "../services/socketService";

const iconByName = { Cone, CircleDot, Droplets, HelpCircle, AlertTriangle };
const categoryIconStyles = {
  "CAT-01": "border-amber-200 bg-amber-50 text-amber-600",
  "CAT-02": "border-orange-200 bg-orange-50 text-orange-600",
  "CAT-03": "border-red-200 bg-red-50 text-red-600",
  "CAT-04": "border-blue-200 bg-blue-50 text-blue-600",
  "CAT-05": "border-slate-300 bg-slate-100 text-slate-600",
};

const REFERENCE_ZONES = [
  { label: "Cercado de Lima (Centro)", lat: -12.046374, lng: -77.042793 },
  { label: "Miraflores / San Isidro", lat: -12.115523, lng: -77.029577 },
  { label: "La Victoria / Santa Beatriz", lat: -12.065903, lng: -77.037086 },
  { label: "Lima Norte (Los Olivos / SMP)", lat: -11.991389, lng: -77.070833 },
  { label: "Lima Este (SJL / Ate)", lat: -12.006389, lng: -76.995278 },
  { label: "Lima Sur (Surco / Chorrillos)", lat: -12.146944, lng: -76.991111 },
];

const RADIUS_OPTIONS = [1, 3, 5, 10, 25, 50];

const STATUS_STEPS = ["REGISTRADO", "EVALUACION", "REPARACION", "RESUELTO"];

const formatDateShort = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDistanceLabel = (distanceKm) => {
  if (typeof distanceKm !== "number" || isNaN(distanceKm)) return null;
  if (distanceKm < 1) {
    return `a ${Math.max(10, Math.round(distanceKm * 1000))} m`;
  }
  return `a ${distanceKm.toFixed(2)} km`;
};

const BackButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-200 cursor-pointer"
    aria-label="Volver"
  >
    <ArrowLeft size={18} />
  </button>
);

export const CitizenPortalPage = () => {
  const { user, logout, refreshProfile } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("home");

  // Estados para creación de nuevo reporte
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [severity, setSeverity] = useState("Alta");
  const [description, setDescription] = useState("");
  const [addressReference, setAddressReference] = useState(
    "Coordenadas fijadas en vía pública"
  );
  const [districtName, setDistrictName] = useState("Cercado de Lima");
  const [coordinates, setCoordinates] = useState({
    lat: -12.046374,
    lng: -77.042793,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransmitConfirm, setShowTransmitConfirm] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);

  // Modal de Seguridad 2FA (accesible desde Mi Perfil)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Sistema de Notificaciones Persistentes y Tiempo Real
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [realtimeToast, setRealtimeToast] = useState(null);

  // Estado del Monitor Vial Georreferenciado
  const [monitorLocation, setMonitorLocation] = useState({
    lat: -12.046374,
    lng: -77.042793,
    source: "default", // 'gps' | 'manual' | 'default'
    label: "Cercado de Lima (Centro)",
  });
  const [geoPermissionState, setGeoPermissionState] = useState("idle"); // 'idle' | 'locating' | 'granted' | 'denied' | 'error'
  const [geoErrorMessage, setGeoErrorMessage] = useState(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [monitorCategoryFilter, setMonitorCategoryFilter] = useState("TODAS");
  const [monitorStatusFilter, setMonitorStatusFilter] = useState("ACTIVOS");
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [selectedMonitorIncident, setSelectedMonitorIncident] = useState(null);
  const [confirmingIncidentId, setConfirmingIncidentId] = useState(null);
  const [confirmFeedback, setConfirmFeedback] = useState(null);

  // Modal de Detalle y Trazabilidad de Reporte
  const [reportDetailModal, setReportDetailModal] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Iniciales dinámicas del usuario autenticado (Primera letra del primer nombre + Primera letra del primer apellido)
  const userInitials = useMemo(
    () => user?.initials || getUserInitials(user),
    [user]
  );

  // Cargar notificaciones desde Supabase vía Backend
  const fetchNotifications = useCallback(async () => {
    try {
      setIsNotificationsLoading(true);
      const { notificaciones, noLeidasCount } = await getNotificaciones();
      setNotifications(notificaciones);
      setUnreadCount(noLeidasCount);
    } catch (err) {
      console.error("Error al consultar notificaciones:", err);
    } finally {
      setIsNotificationsLoading(false);
    }
  }, []);

  // Consultar reportes cercanos reales desde el Backend
  const fetchNearbyReports = useCallback(
    async (coords = monitorLocation, rad = radiusKm, cat = monitorCategoryFilter) => {
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        return;
      }
      try {
        setIsNearbyLoading(true);
        const data = await getIncidentesCercanos({
          lat: coords.lat,
          lng: coords.lng,
          radio: rad,
          categoriaId: cat !== "TODAS" ? cat : null,
        });
        setNearbyIncidents(data);
      } catch (err) {
        console.error("Error al consultar incidentes cercanos:", err);
      } finally {
        setIsNearbyLoading(false);
      }
    },
    [monitorLocation, radiusKm, monitorCategoryFilter]
  );

  // Solicitar geolocalización del navegador para el Monitor Vial
  const requestMonitorGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoPermissionState("error");
      setGeoErrorMessage(
        "Tu navegador no soporta geolocalización. Puedes seleccionar una zona de referencia o tocar cualquier punto del mapa."
      );
      return;
    }

    setGeoPermissionState("locating");
    setGeoErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          source: "gps",
          label: "Tu ubicación GPS actual",
        };
        setMonitorLocation(nextCoords);
        setCoordinates({ lat: nextCoords.lat, lng: nextCoords.lng });
        setGeoPermissionState("granted");
        setGeoErrorMessage(null);
      },
      (err) => {
        const isDenied = err?.code === 1;
        setGeoPermissionState(isDenied ? "denied" : "error");
        setGeoErrorMessage(
          isDenied
            ? "No se concedió el permiso de ubicación en el navegador. Puedes reintentar o explorar reportes seleccionando una zona de referencia abajo."
            : "No se pudo obtener la señal GPS exacta en este momento. Se muestran los reportes usando la ubicación de referencia seleccionada."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Carga inicial de incidentes, notificaciones, perfil y suscripción WebSocket
  useEffect(() => {
    let isMounted = true;

    const loadInitialPortalData = async () => {
      try {
        const [incData, notifRes] = await Promise.all([
          getIncidentes(),
          getNotificaciones().catch(() => ({ notificaciones: [], noLeidasCount: 0 })),
          refreshProfile?.(),
        ]);
        if (isMounted) {
          setIncidents(incData);
          setNotifications(notifRes.notificaciones || []);
          setUnreadCount(notifRes.noLeidasCount || 0);
        }
      } catch (err) {
        console.error("Error al cargar datos del portal ciudadano:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialPortalData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          const nextCoords = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
            source: "gps",
            label: "Tu ubicación GPS actual",
          };
          setMonitorLocation(nextCoords);
          setCoordinates({ lat: nextCoords.lat, lng: nextCoords.lng });
          setGeoPermissionState("granted");
          setGeoErrorMessage(null);
        },
        (err) => {
          if (!isMounted) return;
          const isDenied = err?.code === 1;
          setGeoPermissionState(isDenied ? "denied" : "error");
          setGeoErrorMessage(
            isDenied
              ? "No se concedió el permiso de ubicación en el navegador. Puedes reintentar o explorar reportes seleccionando una zona de referencia abajo."
              : "No se pudo obtener la señal GPS exacta en este momento. Se muestran los reportes usando la ubicación de referencia seleccionada."
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }

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
            : item
        )
      );

      setNearbyIncidents((prev) =>
        prev.map((item) =>
          item.id === id || item._id === id
            ? { ...item, status: nuevoEstado, estado: nuevoEstado }
            : item
        )
      );

      setReportDetailModal((curr) =>
        curr && (curr.id === id || curr._id === id)
          ? { ...curr, status: nuevoEstado, estado: nuevoEstado }
          : curr
      );
    };

    const handleConfirmado = (payload) => {
      const id = payload?.incidenteId || payload?.id;
      const updateList = (list) =>
        list.map((item) =>
          item.id === id || item._id === id
            ? {
                ...item,
                confirmaciones_count:
                  payload?.nuevoContador ?? item.confirmaciones_count + 1,
              }
            : item
        );
      setIncidents(updateList);
      setNearbyIncidents(updateList);
    };

    const handleNuevaNotificacion = (rawNotif) => {
      const notif = normalizeNotificacion(rawNotif);
      if (!notif) return;

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + (notif.is_read ? 0 : 1));
      setRealtimeToast(notif);
    };

    socket.on("incidente:creado", handleNuevoIncidente);
    socket.on("incidente:estado_actualizado", handleEstadoActualizado);
    socket.on("incidente:confirmado", handleConfirmado);
    socket.on("notificacion:nueva", handleNuevaNotificacion);

    return () => {
      isMounted = false;
      socket.off("incidente:creado", handleNuevoIncidente);
      socket.off("incidente:estado_actualizado", handleEstadoActualizado);
      socket.off("incidente:confirmado", handleConfirmado);
      socket.off("notificacion:nueva", handleNuevaNotificacion);
    };
  }, [fetchNotifications, refreshProfile, requestMonitorGeolocation]);

  // Auto-ocultar el toast de notificación en tiempo real tras 7 segundos
  useEffect(() => {
    if (!realtimeToast) return;
    const timer = setTimeout(() => {
      setRealtimeToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [realtimeToast]);

  // Actualizar reportes cercanos cuando cambia ubicación, radio o categoría
  useEffect(() => {
    let active = true;
    getIncidentesCercanos({
      lat: monitorLocation.lat,
      lng: monitorLocation.lng,
      radio: radiusKm,
      categoriaId: monitorCategoryFilter !== "TODAS" ? monitorCategoryFilter : null,
    })
      .then((data) => {
        if (active) setNearbyIncidents(data);
      })
      .catch((err) => {
        console.error("Error al consultar incidentes cercanos:", err);
      });
    return () => {
      active = false;
    };
  }, [monitorLocation, radiusKm, monitorCategoryFilter]);

  // Al entrar a la pantalla de perfil, refrescar datos desde la BD por seguridad
  useEffect(() => {
    if (currentScreen === "profile") {
      refreshProfile?.();
    }
  }, [currentScreen, refreshProfile]);

  // Captura de coordenadas al abrir el formulario de confirmación de reporte
  useEffect(() => {
    if (currentScreen !== "confirm_report" || !navigator.geolocation) return;
    let active = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        setCoordinates({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setIsLocating(false);
      },
      () => {
        if (!active) return;
        setIsLocating(false);
      },
      { timeout: 7000 }
    );
    return () => {
      active = false;
    };
  }, [currentScreen]);

  // Filtrar reportes que pertenecen al ciudadano autenticado
  const citizenIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          (user?.id &&
            (incident.usuario_id === user.id ||
              incident.usuario_creador_id === user.id)) ||
          (user?.dni &&
            (incident.citizenDni === user.dni ||
              String(incident.ciudadano_dni) === String(user.dni))) ||
          (user?.email && incident.usuario_email === user.email)
      ),
    [incidents, user]
  );

  // KPIs personales del ciudadano para el Dashboard
  const citizenStats = useMemo(() => {
    const total = citizenIncidents.length;
    const enEvaluacion = citizenIncidents.filter(
      (i) => i.status === "REGISTRADO" || i.status === "EVALUACION"
    ).length;
    const enReparacion = citizenIncidents.filter(
      (i) => i.status === "REPARACION"
    ).length;
    const resueltos = citizenIncidents.filter(
      (i) => i.status === "RESUELTO"
    ).length;
    return { total, enEvaluacion, enReparacion, resueltos };
  }, [citizenIncidents]);

  // Filtrar incidentes cercanos según el filtro de estado del Monitor Vial
  const filteredNearbyIncidents = useMemo(() => {
    return nearbyIncidents.filter((inc) => {
      if (monitorStatusFilter === "ACTIVOS") {
        return inc.status !== "RESUELTO" && inc.status !== "DESESTIMADO";
      }
      if (monitorStatusFilter === "TODOS") {
        return true;
      }
      return inc.status === monitorStatusFilter;
    });
  }, [nearbyIncidents, monitorStatusFilter]);

  const assignedEntity =
    selectedCategory?.entityId === "ENT-SEDAPAL-NORTE" ||
    selectedCategory?.entityId === "ENT-SEDAPAL"
      ? ENTITIES.SEDAPAL
      : ENTITIES.MML;

  // Marcar una notificación como leída
  const handleMarkAsRead = async (notifId) => {
    try {
      await markNotificacionAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notifId ? { ...n, is_read: true, leido: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error al marcar notificación como leída:", err);
    }
  };

  // Marcar todas las notificaciones como leídas
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificacionesAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, leido: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error al marcar todas las notificaciones como leídas:", err);
    }
  };

  // Abrir el detalle completo y trazabilidad de un reporte
  const openReportDetail = async (incidentOrId, fallbackTicketFolio = null) => {
    let targetId =
      typeof incidentOrId === "object" ? incidentOrId?.id : incidentOrId;

    if (!targetId && fallbackTicketFolio) {
      const found = incidents.find(
        (i) => i.ticketNumber === fallbackTicketFolio || i.folio === fallbackTicketFolio
      );
      targetId = found?.id;
    }

    if (!targetId) {
      setCurrentScreen("history");
      return;
    }

    const baseIncident =
      typeof incidentOrId === "object"
        ? incidentOrId
        : incidents.find((i) => i.id === targetId) ||
          nearbyIncidents.find((i) => i.id === targetId) || { id: targetId };

    setReportDetailModal(baseIncident);
    setIsDetailLoading(true);

    try {
      const fullDetail = await getIncidenteById(targetId);
      if (fullDetail) {
        setReportDetailModal(fullDetail);
      }
    } catch (err) {
      console.warn("No se pudo cargar el historial detallado:", err.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Al seleccionar una notificación en el panel o en el dashboard
  const handleSelectNotification = async (notif) => {
    if (!notif) return;
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setIsNotificationPanelOpen(false);
    setRealtimeToast(null);
    await openReportDetail(notif.report_id, notif.ticket_folio);
  };

  // Confirmar un incidente cercano de otro ciudadano (+1 confirmación)
  const handleConfirmNearbyIncident = async (incident) => {
    if (!incident?.id || confirmingIncidentId) return;
    try {
      setConfirmingIncidentId(incident.id);
      setConfirmFeedback(null);
      const res = await confirmarIncidente(incident.id);
      const nuevoTotal =
        res?.confirmaciones_count ?? (incident.confirmaciones_count || 1) + 1;

      const updateCount = (list) =>
        list.map((item) =>
          item.id === incident.id
            ? { ...item, confirmaciones_count: nuevoTotal }
            : item
        );

      setNearbyIncidents(updateCount);
      setIncidents(updateCount);
      if (selectedMonitorIncident?.id === incident.id) {
        setSelectedMonitorIncident((prev) => ({
          ...prev,
          confirmaciones_count: nuevoTotal,
        }));
      }
      setConfirmFeedback({
        type: "success",
        incidentId: incident.id,
        message: "Has confirmado este incidente vial. ¡Gracias por tu participación!",
      });
    } catch (err) {
      setConfirmFeedback({
        type: "error",
        incidentId: incident.id,
        message: err.message || "No fue posible confirmar este incidente.",
      });
    } finally {
      setConfirmingIncidentId(null);
    }
  };

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSeverity(category.defaultSeverity || "Media");
    setIsLocating(true);
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
      const ticket = await createIncidente({
        citizenDni: user?.dni,
        categoryId: selectedCategory.id,
        categoria_id: selectedCategory.id,
        district: districtName.trim() || "Cercado de Lima",
        distrito: districtName.trim() || "Cercado de Lima",
        address:
          addressReference.trim() || "Coordenadas fijadas en vía pública",
        direccion_referencial:
          addressReference.trim() || "Coordenadas fijadas en vía pública",
        lat: coordinates.lat,
        latitud: coordinates.lat,
        lng: coordinates.lng,
        longitud: coordinates.lng,
        severity,
        severidad: severity,
        description:
          description.trim() ||
          "Reporte generado sin comentarios complementarios.",
        observaciones_ciudadano:
          description.trim() ||
          "Reporte generado sin comentarios complementarios.",
        photoUrl: photoPreview,
        foto_url: photoPreview,
      });

      setIncidents((prev) => {
        if (prev.some((i) => i.id === ticket.id)) return prev;
        return [ticket, ...prev];
      });

      fetchNotifications();
      fetchNearbyReports();

      setSuccessTicket(ticket);
      setShowTransmitConfirm(false);
      setSelectedCategory(null);
      setDescription("");
      setPhotoPreview(null);
    } catch (err) {
      console.error("Error al transmitir reporte:", err);
      alert(err.message || "Error al transmitir el reporte al servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-900 px-0 py-0 md:px-4 md:py-6">
      <div className="relative flex min-h-screen w-full max-w-5xl flex-col bg-slate-50 shadow-2xl md:min-h-[840px] md:rounded-2xl md:overflow-hidden">
        {/* ================================================================= */}
        {/* BARRA SUPERIOR CIUDADANA (REDISEÑADA)                              */}
        {/* ================================================================= */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#081D30] px-4 py-3.5 text-white shadow-md md:px-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setCurrentScreen("home")}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <div className="rounded-lg bg-blue-600 p-2 shadow-xs">
                <ShieldAlert size={19} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight">
                  VíaAlerta
                </h1>
                <p className="text-[10px] text-slate-300">Portal Ciudadano</p>
              </div>
            </button>

            {/* Navegación rápida en pantallas medianas y grandes */}
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/70">
              <button
                type="button"
                onClick={() => setCurrentScreen("home")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  currentScreen === "home"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                <Home size={14} />
                <span>Inicio</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentScreen("history")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  currentScreen === "history"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                <Clock size={14} />
                <span>Mis Reportes ({citizenIncidents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentScreen("monitor")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  currentScreen === "monitor"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                <Compass size={14} />
                <span>Monitor Vial</span>
              </button>
            </nav>
          </div>

          {/* Controles Superiores: Campana de Notificaciones + Avatar de Iniciales */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Botón de Notificaciones con Contador en Tiempo Real */}
            <button
              type="button"
              onClick={() => setIsNotificationPanelOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800/90 text-slate-200 transition hover:bg-slate-700 hover:text-white cursor-pointer"
              aria-label={
                unreadCount > 0
                  ? `Notificaciones (${unreadCount} sin leer)`
                  : "Notificaciones"
              }
              title="Centro de Notificaciones"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#081D30] bg-red-600 px-1 text-[10px] font-extrabold text-white shadow-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Círculo con Iniciales del Ciudadano (Acceso al Detalle del Perfil) */}
            <button
              type="button"
              onClick={() => setCurrentScreen("profile")}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-extrabold tracking-wider text-white shadow-sm transition cursor-pointer ${
                currentScreen === "profile"
                  ? "border-blue-400 bg-blue-600 ring-2 ring-blue-400/40"
                  : "border-slate-500 bg-linear-to-br from-blue-600 to-indigo-700 hover:border-white hover:scale-105"
              }`}
              aria-label={`Abrir perfil de ${user?.name || "Ciudadano"}`}
              title="Mi Perfil"
            >
              {userInitials}
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* AVISO FLOTANTE EN TIEMPO REAL CUANDO LLEGA UNA NOTIFICACIÓN        */}
        {/* ================================================================= */}
        {realtimeToast && (
          <div className="fixed right-4 top-18 z-40 w-full max-w-sm animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-white p-3.5 shadow-2xl ring-1 ring-slate-900/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Bell size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">
                  {realtimeToast.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 leading-snug">
                  {realtimeToast.message}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectNotification(realtimeToast)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Ver reporte ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => setRealtimeToast(null)}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRealtimeToast(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                aria-label="Cerrar aviso"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PANTALLA PRINCIPAL: DASHBOARD CIUDADANO MEJORADO                  */}
        {/* ================================================================= */}
        {currentScreen === "home" && (
          <main className="flex-1 space-y-6 p-4 sm:p-6">
            {/* Banner de Acción Principal + Accesos Rápidos por Categoría */}
            <section className="rounded-2xl bg-linear-to-r from-[#081D30] via-[#0d2b47] to-[#12385b] p-5 sm:p-6 text-white shadow-lg">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Fiscalización Vial Georreferenciada
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    ¿Detectaste un incidente en la vía pública?
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Reporta deterioro asfáltico, veredas dañadas, buzones sin
                    tapa o fugas de agua para su canalización inmediata a MML o
                    Sedapal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentScreen("select_category")}
                  className="flex shrink-0 items-center justify-center gap-2.5 rounded-xl bg-red-600 px-5 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:bg-red-500 active:scale-95 cursor-pointer"
                >
                  <AlertTriangle size={20} />
                  <span>Reportar Incidente</span>
                </button>
              </div>

              {/* Atajos rápidos por tipo de incidente */}
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Acceso rápido por categoría frecuente:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {INCIDENT_CATEGORIES.slice(0, 4).map((category) => {
                    const Icon = iconByName[category.iconName] || AlertTriangle;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectCategory(category)}
                        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/15 hover:border-white/25 cursor-pointer"
                      >
                        <div className="rounded-lg bg-white/10 p-2 text-blue-300 shrink-0">
                          <Icon size={16} />
                        </div>
                        <span className="line-clamp-2 text-[11px] font-semibold text-slate-100 leading-tight">
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Resumen Estadístico de Mis Reportes (KPIs Personales) */}
            <section aria-label="Resumen de mis reportes">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Resumen de Mi Participación Ciudadana
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentScreen("history")}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Ver todos mis reportes →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Total Reportados
                  </span>
                  <p className="mt-1 text-2xl font-extrabold text-[#081D30]">
                    {citizenStats.total}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Alertas enviadas
                  </span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-800">
                    En Revisión / Eval.
                  </span>
                  <p className="mt-1 text-2xl font-extrabold text-amber-700">
                    {citizenStats.enEvaluacion}
                  </p>
                  <span className="text-[10px] text-amber-700/80">
                    Recibidos o en evaluación
                  </span>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-blue-800">
                    En Reparación
                  </span>
                  <p className="mt-1 text-2xl font-extrabold text-blue-700">
                    {citizenStats.enReparacion}
                  </p>
                  <span className="text-[10px] text-blue-700/80">
                    Con cuadrilla asignada
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-800">
                    Solucionados
                  </span>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-700">
                    {citizenStats.resueltos}
                  </p>
                  <span className="text-[10px] text-emerald-700/80">
                    Intervención concluida
                  </span>
                </div>
              </div>
            </section>

            {/* Grilla Principal del Dashboard: Seguimiento + Monitor Vial y Notificaciones */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Columna Izquierda: Seguimiento y Actividad Reciente de Mis Reportes */}
              <section className="space-y-4 lg:col-span-7">
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                        <Clock size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Seguimiento de Mis Reportes Recientes
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Estado en tiempo real de tus últimas incidencias
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen("history")}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Historial ({citizenIncidents.length})
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      <Loader2
                        size={20}
                        className="mx-auto mb-2 animate-spin text-[#081D30]"
                      />
                      Cargando tus reportes...
                    </div>
                  ) : citizenIncidents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <FileText
                        size={28}
                        className="mx-auto mb-2 text-slate-400"
                      />
                      <p className="text-xs font-bold text-slate-700">
                        Aún no has registrado reportes viales
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Usa el botón superior &ldquo;Reportar Incidente&rdquo;
                        para registrar tu primera alerta georreferenciada.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {citizenIncidents.slice(0, 3).map((item) => {
                        const status =
                          INCIDENT_STATUS[item.status] ||
                          INCIDENT_STATUS.REGISTRADO;
                        const currentStepIdx = STATUS_STEPS.indexOf(
                          item.status
                        );

                        return (
                          <article
                            key={item.id}
                            onClick={() => openReportDetail(item)}
                            className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-blue-300 hover:bg-white hover:shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 border border-slate-200">
                                {item.ticketNumber}
                              </span>
                              <span
                                className={`rounded border px-2 py-0.5 text-[10px] font-bold ${status.badge}`}
                              >
                                {status.label}
                              </span>
                            </div>

                            <p className="mt-2 text-xs font-bold text-slate-800 group-hover:text-blue-700">
                              {item.categoryName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                              {item.address} · {item.district}
                            </p>

                            {/* Barra de progreso de etapas si no está desestimado */}
                            {item.status !== "DESESTIMADO" && (
                              <div className="mt-3 grid grid-cols-4 gap-1.5">
                                {STATUS_STEPS.map((stepKey, idx) => {
                                  const reached =
                                    currentStepIdx >= idx &&
                                    currentStepIdx !== -1;
                                  return (
                                    <div key={stepKey} className="space-y-1">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          reached
                                            ? item.status === "RESUELTO"
                                              ? "bg-emerald-500"
                                              : "bg-blue-600"
                                            : "bg-slate-200"
                                        }`}
                                      />
                                      <span
                                        className={`block text-[9px] font-semibold ${
                                          reached
                                            ? "text-slate-700"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {INCIDENT_STATUS[stepKey]?.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[10px] text-slate-500">
                              <span>{item.entityName}</span>
                              <span className="font-semibold text-blue-600 group-hover:underline">
                                Ver trazabilidad →
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Columna Derecha: Monitor Vial Cercano + Últimas Notificaciones */}
              <section className="space-y-4 lg:col-span-5">
                {/* Tarjeta de Incidentes Cercanos (Monitor Vial en Vivo) */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                        <Layers size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Monitor Vial en Tu Zona
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {monitorLocation.source === "gps"
                            ? `Radio ${radiusKm} km desde tu GPS`
                            : `Referencia: ${monitorLocation.label}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen("monitor")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 cursor-pointer"
                    >
                      Abrir Mapa
                    </button>
                  </div>

                  {filteredNearbyIncidents.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No se registran incidentes activos dentro del radio de{" "}
                      {radiusKm} km.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredNearbyIncidents.slice(0, 3).map((inc) => {
                        const status =
                          INCIDENT_STATUS[inc.status] ||
                          INCIDENT_STATUS.REGISTRADO;
                        const distLabel = formatDistanceLabel(inc.distanceKm);
                        return (
                          <div
                            key={inc.id}
                            onClick={() => {
                              setSelectedMonitorIncident(inc);
                              setCurrentScreen("monitor");
                            }}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 hover:border-emerald-400 hover:bg-emerald-50/20 transition cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {inc.categoryName}
                              </p>
                              <p className="truncate text-[10px] text-slate-500">
                                {inc.address} · {inc.district}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold ${status.badge}`}
                              >
                                {status.label}
                              </span>
                              {distLabel && (
                                <span className="mt-0.5 block text-[10px] font-bold text-emerald-700">
                                  {distLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tarjeta de Notificaciones Recientes */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                        <Bell size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Notificaciones Recientes
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} sin leer`
                            : "Todas leídas"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNotificationPanelOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Ver panel →
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
                      Aún no tienes notificaciones registradas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.slice(0, 3).map((notif) => (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleSelectNotification(notif)}
                          className={`w-full rounded-lg border p-2.5 text-left transition cursor-pointer ${
                            !notif.is_read
                              ? "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-slate-800">
                              {notif.title}
                            </span>
                            {!notif.is_read && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                            {notif.message}
                          </p>
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {formatNotificationDate(notif.created_at)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        )}

        {/* ================================================================= */}
        {/* PANTALLA: MI PERFIL (CON DNI DESDE BD + 2FA INTEGRADO)            */}
        {/* ================================================================= */}
        {currentScreen === "profile" && (
          <main className="flex-1 p-4 sm:p-6 max-w-2xl w-full mx-auto">
            <div className="mb-5 flex items-center gap-2">
              <BackButton onClick={() => setCurrentScreen("home")} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Mi Perfil Ciudadano
              </h2>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#081D30] to-blue-700 text-xl font-extrabold tracking-wider text-white shadow-md">
                  {userInitials}
                </div>
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    {user?.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Ciudadano Registrado
                    </span>
                    {user?.dni && (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                        DNI {user.dni}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <dt className="text-[11px] font-semibold text-slate-400 uppercase">
                    Nombres completos
                  </dt>
                  <dd className="mt-1 font-bold text-slate-800 text-sm">
                    {user?.name || "No especificado"}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <dt className="text-[11px] font-semibold text-slate-400 uppercase">
                    Documento Nacional de Identidad (DNI)
                  </dt>
                  <dd
                    data-testid="profile-dni-value"
                    className="mt-1 font-mono text-sm font-extrabold text-[#081D30]"
                  >
                    {user?.dni || "No especificado"}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 sm:col-span-2">
                  <dt className="text-[11px] font-semibold text-slate-400 uppercase">
                    Correo electrónico
                  </dt>
                  <dd className="mt-1 break-all font-bold text-slate-800 text-sm">
                    {user?.email}
                  </dd>
                </div>
              </dl>

              {/* Módulo de Seguridad 2FA en Perfil */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg border ${
                        user?.dos_pasos_activo
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {user?.dos_pasos_activo ? (
                        <ShieldCheck size={20} />
                      ) : (
                        <ShieldAlert size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        Autenticación en Dos Pasos (2FA)
                      </p>
                      <p className="text-xs text-slate-500">
                        {user?.dos_pasos_activo
                          ? "Protección TOTP activa en tu cuenta ciudadana"
                          : "Agrega un segundo factor de seguridad con código QR TOTP"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      user?.dos_pasos_activo
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {user?.dos_pasos_activo ? "2FA Activo" : "Inactivo"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="mt-3.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-bold text-[#081D30] hover:bg-slate-100 active:scale-[0.99] transition shadow-2xs cursor-pointer"
                >
                  {user?.dos_pasos_activo
                    ? "Gestionar / Reconfigurar 2FA"
                    : "Configurar y Activar 2FA"}
                </button>
              </div>

              <button
                type="button"
                onClick={logout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold uppercase text-white shadow transition hover:bg-red-700 cursor-pointer"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </section>
          </main>
        )}

        {/* ================================================================= */}
        {/* PANTALLA: SELECCIONAR CATEGORÍA DE REPORTE                        */}
        {/* ================================================================= */}
        {currentScreen === "select_category" && (
          <main className="flex-1 p-4 sm:p-6 max-w-2xl w-full mx-auto">
            <div className="mb-4 flex items-center gap-2">
              <BackButton onClick={() => setCurrentScreen("home")} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Seleccione el tipo de daño vial
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
                    type="button"
                    onClick={() => selectCategory(category)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white p-4 text-left shadow-2xs transition hover:border-[#081D30] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg border p-2.5 ${
                          categoryIconStyles[category.id] ||
                          categoryIconStyles["CAT-05"]
                        }`}
                      >
                        <Icon size={21} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                          {category.name}
                        </p>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          Entidad receptora: {entityName}
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

        {/* ================================================================= */}
        {/* PANTALLA: CONFIRMAR Y ENVIAR REPORTE                              */}
        {/* ================================================================= */}
        {currentScreen === "confirm_report" && selectedCategory && (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl w-full mx-auto">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setShowTransmitConfirm(true);
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <BackButton
                  onClick={() => setCurrentScreen("select_category")}
                />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Confirmar reporte ciudadano
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Revise la ubicación y detalles antes de transmitir.
                  </p>
                </div>
              </div>

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Resumen de Clasificación
                </p>
                <div className="text-xs">
                  <p className="font-bold text-slate-800 text-sm">
                    {selectedCategory.name}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Entidad receptora:{" "}
                    <strong className="text-slate-800">
                      {assignedEntity.name}
                    </strong>
                  </p>
                  <div className="mt-3">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                      Nivel de severidad:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {["Baja", "Media", "Alta", "Critica"].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSeverity(lvl)}
                          className={`rounded-lg border py-1.5 text-xs font-bold transition cursor-pointer ${
                            severity === lvl
                              ? "border-[#081D30] bg-[#081D30] text-white"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Ubicación Georreferenciada
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {isLocating ? "Capturando GPS..." : "GPS fijado"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <MapPin size={16} className="text-blue-600" />
                  <span>Coordenadas capturadas</span>
                </div>
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-600">
                  Lat: {coordinates.lat} | Lng: {coordinates.lng}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Distrito
                    </label>
                    <input
                      type="text"
                      value={districtName}
                      onChange={(e) => setDistrictName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-[#081D30]"
                      placeholder="Ej. Cercado de Lima"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Dirección o referencia
                    </label>
                    <input
                      type="text"
                      value={addressReference}
                      onChange={(e) => setAddressReference(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-[#081D30]"
                      placeholder="Ej. Av. Abancay cdra. 4"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Evidencia fotográfica opcional
                </p>
                {photoPreview ? (
                  <div className="relative h-40 overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
                    <img
                      src={photoPreview}
                      alt="Vista previa de evidencia"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white cursor-pointer"
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
                      Subir de Galería
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

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Descripción adicional
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Observaciones opcionales sobre el incidente vial..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#081D30]"
                />
              </section>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#081D30] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Enviar Reporte Oficial
              </button>
            </form>
          </main>
        )}

        {/* ================================================================= */}
        {/* PANTALLA: MONITOR VIAL REAL (GEOLOCALIZACIÓN + LEAFLET MAP)       */}
        {/* ================================================================= */}
        {currentScreen === "monitor" && (
          <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BackButton onClick={() => setCurrentScreen("home")} />
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-800">
                    Monitor Vial Georreferenciado
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Incidentes reales reportados cerca de tu ubicación
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={requestMonitorGeolocation}
                  disabled={geoPermissionState === "locating"}
                  className="flex items-center gap-1.5 rounded-lg bg-[#081D30] px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {geoPermissionState === "locating" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Navigation size={14} />
                  )}
                  <span>
                    {geoPermissionState === "locating"
                      ? "Obteniendo GPS..."
                      : "Usar mi ubicación GPS"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchNearbyReports()}
                  disabled={isNearbyLoading}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Actualizar incidentes cercanos"
                >
                  <RefreshCw
                    size={14}
                    className={isNearbyLoading ? "animate-spin" : ""}
                  />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Banner explicativo si el usuario no concedió permiso GPS o falló la señal */}
            {geoErrorMessage && (
              <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="font-bold">Aviso de geolocalización</p>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                      {geoErrorMessage}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestMonitorGeolocation}
                  className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  Reintentar GPS
                </button>
              </div>
            )}

            {/* Barra de Configuración del Monitor Vial (Zona de referencia, Radio, Categoría y Estado) */}
            <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Zona / Punto de referencia
                </label>
                <select
                  value={
                    REFERENCE_ZONES.find(
                      (z) =>
                        Math.abs(z.lat - monitorLocation.lat) < 0.001 &&
                        Math.abs(z.lng - monitorLocation.lng) < 0.001
                    )?.label || "CUSTOM"
                  }
                  onChange={(e) => {
                    const zone = REFERENCE_ZONES.find(
                      (z) => z.label === e.target.value
                    );
                    if (zone) {
                      setMonitorLocation({
                        lat: zone.lat,
                        lng: zone.lng,
                        source: "manual",
                        label: zone.label,
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#081D30]"
                >
                  {monitorLocation.source === "gps" && (
                    <option value="CUSTOM">📍 Mi ubicación GPS actual</option>
                  )}
                  {monitorLocation.source === "manual" &&
                    !REFERENCE_ZONES.some(
                      (z) =>
                        Math.abs(z.lat - monitorLocation.lat) < 0.001 &&
                        Math.abs(z.lng - monitorLocation.lng) < 0.001
                    ) && (
                      <option value="CUSTOM">
                        📌 Punto elegido en el mapa ({monitorLocation.lat},{" "}
                        {monitorLocation.lng})
                      </option>
                    )}
                  {REFERENCE_ZONES.map((zone) => (
                    <option key={zone.label} value={zone.label}>
                      {zone.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Radio de búsqueda
                </label>
                <div className="flex items-center gap-1">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusKm(r)}
                      className={`flex-1 rounded-lg border py-1.5 text-[11px] font-bold transition cursor-pointer ${
                        radiusKm === r
                          ? "border-[#081D30] bg-[#081D30] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Categoría de incidente
                </label>
                <select
                  value={monitorCategoryFilter}
                  onChange={(e) => setMonitorCategoryFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#081D30]"
                >
                  <option value="TODAS">Todas las categorías</option>
                  {INCIDENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  Estado del reporte
                </label>
                <select
                  value={monitorStatusFilter}
                  onChange={(e) => setMonitorStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#081D30]"
                >
                  <option value="ACTIVOS">Activos (En atención)</option>
                  <option value="TODOS">Todos los estados</option>
                  <option value="REGISTRADO">Registrado</option>
                  <option value="EVALUACION">En Evaluación</option>
                  <option value="REPARACION">En Reparación</option>
                  <option value="RESUELTO">Resuelto</option>
                </select>
              </div>
            </section>

            {/* Mapa Interactivo Leaflet + OpenStreetMap */}
            <RoadMonitorMap
              userLocation={monitorLocation}
              radiusKm={radiusKm}
              incidents={filteredNearbyIncidents}
              selectedIncidentId={selectedMonitorIncident?.id}
              onSelectIncident={(inc) => setSelectedMonitorIncident(inc)}
              onChangeReferenceLocation={(coords) => {
                setMonitorLocation({
                  ...coords,
                  label: `Punto seleccionado (${coords.lat}, ${coords.lng})`,
                });
              }}
            />

            {/* Tarjeta de Detalle Rápido cuando se selecciona un marcador en el mapa */}
            {selectedMonitorIncident && (
              <section className="rounded-xl border-2 border-[#081D30] bg-white p-4 shadow-md animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                        {selectedMonitorIncident.ticketNumber}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                          (
                            INCIDENT_STATUS[selectedMonitorIncident.status] ||
                            INCIDENT_STATUS.REGISTRADO
                          ).badge
                        }`}
                      >
                        {
                          (
                            INCIDENT_STATUS[selectedMonitorIncident.status] ||
                            INCIDENT_STATUS.REGISTRADO
                          ).label
                        }
                      </span>
                      {formatDistanceLabel(
                        selectedMonitorIncident.distanceKm
                      ) && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          📍{" "}
                          {formatDistanceLabel(
                            selectedMonitorIncident.distanceKm
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">
                      {selectedMonitorIncident.categoryName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMonitorIncident(null)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                    aria-label="Cerrar selección"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {selectedMonitorIncident.description ||
                    "Incidente vial reportado en la vía pública."}
                </p>

                {selectedMonitorIncident.photoUrl && (
                  <div className="mt-3 h-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                    <img
                      src={selectedMonitorIncident.photoUrl}
                      alt="Evidencia del incidente vial"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  <div>
                    <span className="font-semibold text-slate-700">
                      {selectedMonitorIncident.address}
                    </span>{" "}
                    · {selectedMonitorIncident.district}
                  </div>
                  <span>
                    Reportado:{" "}
                    {formatDateShort(selectedMonitorIncident.createdAt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openReportDetail(selectedMonitorIncident)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Ver trazabilidad completa
                  </button>

                  {!selectedMonitorIncident.esMio && (
                    <button
                      type="button"
                      disabled={
                        confirmingIncidentId === selectedMonitorIncident.id
                      }
                      onClick={() =>
                        handleConfirmNearbyIncident(selectedMonitorIncident)
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      <ThumbsUp size={13} />
                      <span>
                        Confirmar incidencia (
                        {selectedMonitorIncident.confirmaciones_count || 1})
                      </span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* retroalimentación al confirmar un incidente */}
            {confirmFeedback && (
              <div
                className={`rounded-xl border p-3 text-xs font-medium ${
                  confirmFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {confirmFeedback.message}
              </div>
            )}

            {/* Lista de Reportes Cercanos Ordenados por Cercanía */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Reportes Cercanos Ordenados por Distancia (
                {filteredNearbyIncidents.length})
              </h3>
              <span className="font-mono text-[11px] text-slate-500">
                Ref: {monitorLocation.lat.toFixed(4)},{" "}
                {monitorLocation.lng.toFixed(4)}
              </span>
            </div>

            {isNearbyLoading ? (
              <div className="py-10 text-center text-xs text-slate-500">
                <Loader2
                  size={22}
                  className="mx-auto mb-2 animate-spin text-[#081D30]"
                />
                Buscando reportes viales dentro de {radiusKm} km...
              </div>
            ) : filteredNearbyIncidents.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white py-10 px-4 text-center">
                <MapPin size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-bold text-slate-700">
                  No se encontraron reportes en un radio de {radiusKm} km
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Puedes ampliar el radio de búsqueda a 25 km o 50 km, o elegir
                  otra zona de referencia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredNearbyIncidents.map((incident) => {
                  const status =
                    INCIDENT_STATUS[incident.status] ||
                    INCIDENT_STATUS.REGISTRADO;
                  const distLabel = formatDistanceLabel(incident.distanceKm);
                  const isSelected = selectedMonitorIncident?.id === incident.id;

                  return (
                    <article
                      key={incident.id}
                      onClick={() => setSelectedMonitorIncident(incident)}
                      className={`flex flex-col justify-between rounded-xl border bg-white p-4 shadow-2xs transition cursor-pointer ${
                        isSelected
                          ? "border-[#081D30] ring-2 ring-[#081D30]/15"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                              {incident.ticketNumber}
                            </span>
                            {distLabel && (
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                                {distLabel}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${status.badge}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <h4 className="mt-2 text-xs sm:text-sm font-bold text-slate-800">
                          {incident.categoryName}
                        </h4>

                        {incident.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                            {incident.description}
                          </p>
                        )}

                        {incident.photoUrl && (
                          <div className="mt-2.5 h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            <img
                              src={incident.photoUrl}
                              alt="Evidencia fotográfica del incidente"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-slate-700">
                            📍 {incident.address} ({incident.district})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{formatDateShort(incident.createdAt)}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReportDetail(incident);
                              }}
                              className="font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Detalles
                            </button>
                            {!incident.esMio && (
                              <button
                                type="button"
                                disabled={confirmingIncidentId === incident.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmNearbyIncident(incident);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                              >
                                <ThumbsUp size={11} />
                                <span>
                                  Confirmar ({incident.confirmaciones_count || 1})
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* ================================================================= */}
        {/* PANTALLA: HISTORIAL DE MIS REPORTES                               */}
        {/* ================================================================= */}
        {currentScreen === "history" && (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BackButton onClick={() => setCurrentScreen("home")} />
                <div>
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-800">
                    Mis Reportes Ciudadanos
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Seleccione cualquier reporte para consultar su historial de
                    atención
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                {citizenIncidents.length} reportes
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Loader2
                  size={20}
                  className="mx-auto mb-2 animate-spin text-[#081D30]"
                />
                Consultando historial de reportes...
              </div>
            ) : citizenIncidents.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold text-slate-600">
                  No tiene incidentes registrados en su historial.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {citizenIncidents.map((item) => {
                  const status =
                    INCIDENT_STATUS[item.status] || INCIDENT_STATUS.REGISTRADO;
                  return (
                    <article
                      key={item.id}
                      onClick={() => openReportDetail(item)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-blue-400 hover:shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                          {item.ticketNumber}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${status.badge}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        {item.categoryName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.address} · {item.district}
                      </p>
                      {item.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-3 flex justify-between border-t border-slate-100 pt-2.5 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {item.entityName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateShort(item.createdAt)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* ================================================================= */}
        {/* MODAL DE CONFIRMACIÓN DE ENVÍO DE REPORTE                         */}
        {/* ================================================================= */}
        {showTransmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-slate-800">
                Confirmar envío
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                ¿Desea transmitir este reporte a {assignedEntity.name}?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransmitConfirm(false)}
                  className="rounded-lg border border-slate-300 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Revisar
                </button>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={isSubmitting}
                  className="flex items-center justify-center rounded-lg bg-[#081D30] py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Confirmar Envío"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL DE ÉXITO AL CREAR UN REPORTE                                */}
        {/* ================================================================= */}
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
                El incidente fue ingresado al sistema de fiscalización y se ha
                generado tu notificación de recepción.
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
                className="w-full rounded-lg bg-[#081D30] py-2.5 text-xs font-bold uppercase text-white cursor-pointer"
              >
                Ver en Mis Reportes
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL DE DETALLE Y TRAZABILIDAD DEL REPORTE                       */}
        {/* ================================================================= */}
        {reportDetailModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setReportDetailModal(null);
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between bg-[#081D30] px-5 py-4 text-white">
                <div>
                  <span className="font-mono text-[11px] font-bold text-blue-300">
                    {reportDetailModal.ticketNumber || "Detalle de Reporte"}
                  </span>
                  <h3 className="text-sm font-bold">
                    {reportDetailModal.categoryName || "Incidente Vial"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReportDetailModal(null)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded border px-2.5 py-1 text-xs font-bold ${
                      (
                        INCIDENT_STATUS[reportDetailModal.status] ||
                        INCIDENT_STATUS.REGISTRADO
                      ).badge
                    }`}
                  >
                    Estado actual:{" "}
                    {
                      (
                        INCIDENT_STATUS[reportDetailModal.status] ||
                        INCIDENT_STATUS.REGISTRADO
                      ).label
                    }
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Confirmaciones vecinales:{" "}
                    <strong>
                      {reportDetailModal.confirmaciones_count || 1}
                    </strong>
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                  <p>
                    <span className="text-slate-400">Entidad asignada:</span>{" "}
                    <strong className="text-slate-800">
                      {reportDetailModal.entityName}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Ubicación:</span>{" "}
                    <strong className="text-slate-800">
                      {reportDetailModal.address} ({reportDetailModal.district})
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Coordenadas:</span>{" "}
                    <span className="font-mono text-slate-700">
                      {reportDetailModal.lat}, {reportDetailModal.lng}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-400">Descripción:</span>{" "}
                    <span className="text-slate-700">
                      {reportDetailModal.description || "Sin observaciones"}
                    </span>
                  </p>
                  {reportDetailModal.motivo_desestimacion && (
                    <p className="text-rose-700 font-semibold">
                      Motivo de desestimación:{" "}
                      {reportDetailModal.motivo_desestimacion}
                    </p>
                  )}
                </div>

                {reportDetailModal.photoUrl && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 h-44">
                    <img
                      src={reportDetailModal.photoUrl}
                      alt="Evidencia del incidente"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Línea de tiempo del historial de estados */}
                <div>
                  <h4 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Historial Auditable de Estados
                  </h4>
                  {isDetailLoading ? (
                    <div className="py-4 text-center text-slate-400">
                      <Loader2 size={16} className="mx-auto animate-spin" />
                    </div>
                  ) : Array.isArray(reportDetailModal.historial) &&
                    reportDetailModal.historial.length > 0 ? (
                    <ol className="relative border-l-2 border-slate-200 ml-2 space-y-3 pl-4">
                      {reportDetailModal.historial.map((h) => {
                        const st =
                          INCIDENT_STATUS[h.estado_nuevo] ||
                          INCIDENT_STATUS.REGISTRADO;
                        return (
                          <li key={h.id} className="relative">
                            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${st.badge}`}
                              >
                                {st.label}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDateShort(h.creado_en)}
                              </span>
                            </div>
                            {h.nota_observacion && (
                              <p className="mt-1 text-[11px] text-slate-600">
                                {h.nota_observacion}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Reporte registrado en el sistema.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setReportDetailModal(null)}
                  className="rounded-lg bg-[#081D30] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PANEL DE NOTIFICACIONES CIUDADANAS                                */}
        {/* ================================================================= */}
        <NotificationPanel
          isOpen={isNotificationPanelOpen}
          onClose={() => setIsNotificationPanelOpen(false)}
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isNotificationsLoading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onSelectNotification={handleSelectNotification}
        />

        {/* ================================================================= */}
        {/* MODAL DE SEGURIDAD 2FA (DESDE MI PERFIL)                          */}
        {/* ================================================================= */}
        <Security2FAModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
        />
      </div>
    </div>
  );
};
