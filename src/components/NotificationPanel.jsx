import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  FileSearch,
  XCircle,
  ExternalLink,
  X,
  Inbox,
} from "lucide-react";
import { INCIDENT_STATUS } from "../services/mockData";
import { formatNotificationDate } from "../services/notificationService";

const getEventVisuals = (type) => {
  const normalized = (type || "REGISTRADO").toUpperCase();
  switch (normalized) {
    case "RESUELTO":
      return {
        Icon: CheckCircle2,
        iconBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        statusInfo: INCIDENT_STATUS.RESUELTO,
      };
    case "REPARACION":
      return {
        Icon: Wrench,
        iconBg: "bg-blue-100 text-blue-700 border-blue-200",
        statusInfo: INCIDENT_STATUS.REPARACION,
      };
    case "EVALUACION":
      return {
        Icon: FileSearch,
        iconBg: "bg-amber-100 text-amber-700 border-amber-200",
        statusInfo: INCIDENT_STATUS.EVALUACION,
      };
    case "DESESTIMADO":
      return {
        Icon: XCircle,
        iconBg: "bg-rose-100 text-rose-700 border-rose-200",
        statusInfo: INCIDENT_STATUS.DESESTIMADO,
      };
    default:
      return {
        Icon: AlertTriangle,
        iconBg: "bg-slate-100 text-slate-700 border-slate-300",
        statusInfo: INCIDENT_STATUS.REGISTRADO,
      };
  }
};

export const NotificationPanel = ({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
}) => {
  const [filter, setFilter] = useState("ALL"); // "ALL" | "UNREAD"

  if (!isOpen) return null;

  const filteredList =
    filter === "UNREAD"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside
        aria-labelledby="notifications-panel-title"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200"
      >
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between bg-[#081D30] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="relative rounded-lg bg-blue-600/30 p-2 text-blue-300 border border-blue-500/30">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2
                id="notifications-panel-title"
                className="text-sm font-bold tracking-tight"
              >
                Centro de Notificaciones
              </h2>
              <p className="text-[11px] text-slate-300">
                {unreadCount > 0
                  ? `Tienes ${unreadCount} ${unreadCount === 1 ? "notificación sin leer" : "notificaciones sin leer"}`
                  : "Estás al día con tus reportes"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            aria-label="Cerrar panel de notificaciones"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Filtros y Acción Rápida */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/80 p-0.5">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                filter === "ALL"
                  ? "bg-white text-[#081D30] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNREAD")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                filter === "UNREAD"
                  ? "bg-white text-[#081D30] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              title="Marcar todas las notificaciones como leídas"
            >
              <CheckCheck size={14} />
              <span>Marcar todas leídas</span>
            </button>
          )}
        </div>

        {/* Lista de Notificaciones */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#081D30]" />
              <p className="mt-3 text-xs font-semibold text-slate-600">
                Consultando tus notificaciones...
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Inbox size={26} />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {filter === "UNREAD"
                  ? "No tienes notificaciones pendientes por leer"
                  : "Todavía no tienes notificaciones"}
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                {filter === "UNREAD"
                  ? "Has revisado todas las actualizaciones recientes de tus reportes viales."
                  : "Cuando envíes un reporte o una entidad actualice su estado de atención, recibirás un aviso aquí en tiempo real."}
              </p>
            </div>
          ) : (
            filteredList.map((notif) => {
              const { Icon, iconBg, statusInfo } = getEventVisuals(notif.type);
              const isUnread = !notif.is_read;

              return (
                <article
                  key={notif.id}
                  className={`group relative flex gap-3.5 p-4 transition ${
                    isUnread
                      ? "bg-blue-50/50 hover:bg-blue-50/80"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* Indicador lateral de no leída */}
                  {isUnread && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"
                      aria-hidden="true"
                    />
                  )}

                  {/* Icono del tipo de evento */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${iconBg}`}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Cuerpo de la notificación */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectNotification?.(notif)}
                        className="text-left focus:outline-none cursor-pointer"
                      >
                        <h3
                          className={`text-xs leading-snug ${
                            isUnread
                              ? "font-extrabold text-slate-900"
                              : "font-semibold text-slate-700"
                          } group-hover:text-blue-700 transition`}
                        >
                          {notif.title}
                        </h3>
                      </button>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead?.(notif.id);
                          }}
                          className="shrink-0 rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                          title="Marcar como leída"
                        >
                          <span className="flex items-center gap-1">
                            <Check size={11} />
                            Leída
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Badges de estado y folio */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {notif.ticket_folio && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 border border-slate-200">
                          {notif.ticket_folio}
                        </span>
                      )}
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${statusInfo.badge}`}
                      >
                        {statusInfo.label}
                      </span>
                      {!isUnread && (
                        <span className="text-[10px] font-medium text-slate-400">
                          · Leída
                        </span>
                      )}
                    </div>

                    {/* Mensaje descriptivo */}
                    <p
                      onClick={() => onSelectNotification?.(notif)}
                      className={`mt-1.5 text-xs leading-relaxed cursor-pointer ${
                        isUnread ? "text-slate-700 font-medium" : "text-slate-500"
                      }`}
                    >
                      {notif.message}
                    </p>

                    {/* Pie con fecha/hora y enlace al reporte */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatNotificationDate(notif.created_at)}
                      </span>

                      {(notif.report_id || notif.ticket_folio) && (
                        <button
                          type="button"
                          onClick={() => onSelectNotification?.(notif)}
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <span>Ver reporte</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
