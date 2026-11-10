import { apiFetch } from "./api";

/**
 * Normaliza un objeto de notificación proveniente de la API REST o Socket.IO.
 */
export const normalizeNotificacion = (notif) => {
  if (!notif) return null;
  const id = notif.id || notif._id;
  const userId = notif.usuario_id || notif.user_id || null;
  const reportId = notif.incidente_id || notif.report_id || null;
  const ticketFolio =
    notif.ticket_folio ||
    notif.ticketNumber ||
    (notif.titulo && notif.titulo.match(/(TKT-[0-9]{4}-[0-9]+)/)?.[1]) ||
    (notif.mensaje && notif.mensaje.match(/(TKT-[0-9]{4}-[0-9]+)/)?.[1]) ||
    null;
  const title = notif.titulo || notif.title || "Actualización de tu reporte";
  const message = notif.mensaje || notif.message || "";
  const type = (notif.tipo || notif.type || "REGISTRADO").toUpperCase();
  const isRead = Boolean(notif.leido ?? notif.is_read ?? false);
  const createdAt =
    notif.creado_en || notif.created_at || new Date().toISOString();

  return {
    ...notif,
    id,
    usuario_id: userId,
    user_id: userId,
    incidente_id: reportId,
    report_id: reportId,
    ticket_folio: ticketFolio,
    ticketNumber: ticketFolio,
    titulo: title,
    title,
    mensaje: message,
    message,
    tipo: type,
    type,
    leido: isRead,
    is_read: isRead,
    creado_en: createdAt,
    created_at: createdAt,
  };
};

/**
 * Obtiene todas las notificaciones del ciudadano autenticado.
 */
export const getNotificaciones = async () => {
  const data = await apiFetch("/api/notificaciones");
  const rawList = Array.isArray(data) ? data : data?.notificaciones || [];
  const notificaciones = rawList.map(normalizeNotificacion).filter(Boolean);
  const noLeidasCount =
    typeof data?.noLeidasCount === "number"
      ? data.noLeidasCount
      : notificaciones.filter((n) => !n.is_read).length;

  return {
    notificaciones,
    noLeidasCount,
  };
};

/**
 * Marca una notificación individual como leída.
 */
export const markNotificacionAsRead = async (id) => {
  const data = await apiFetch(`/api/notificaciones/${id}/leer`, {
    method: "PATCH",
  });
  return normalizeNotificacion(data);
};

/**
 * Marca todas las notificaciones del ciudadano como leídas.
 */
export const markAllNotificacionesAsRead = async () => {
  return await apiFetch("/api/notificaciones/leer-todas", {
    method: "PATCH",
  });
};

/**
 * Formatea una fecha ISO de notificación con tiempo relativo y fecha legible.
 */
export const formatNotificationDate = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  const exactStr = date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffMin < 1) return `Hace instantes · ${exactStr}`;
  if (diffMin < 60) return `Hace ${diffMin} min · ${exactStr}`;
  if (diffHours < 24) return `Hace ${diffHours} h · ${exactStr}`;
  return exactStr;
};
