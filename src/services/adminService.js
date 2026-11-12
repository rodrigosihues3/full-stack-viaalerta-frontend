import { apiFetch } from "./api";

/**
 * Consulta las métricas globales de gobernanza para la consola de administración.
 * Retorna { total_entidades, desglose_entidades, total_operadores, total_ciudadanos, fiabilidad_global }.
 */
export const getMetricasAdmin = async () => {
  const data = await apiFetch("/api/admin/metricas");
  return data;
};

/**
 * Obtiene el padrón de usuarios registrados con métricas de fiscalización y fiabilidad.
 * Retorna una lista de usuarios con fiabilidad_pct, total_reportes, rol, estado, etc.
 */
export const getUsuariosAdmin = async () => {
  const data = await apiFetch("/api/admin/usuarios");
  return Array.isArray(data) ? data : data?.usuarios || [];
};

/**
 * Modifica el estado de acceso (activo / suspendido) de un usuario en el sistema.
 * @param {string|number} id - Identificador del usuario.
 * @param {boolean} activo - Nuevo estado de actividad.
 */
export const cambiarEstadoUsuario = async (id, activo) => {
  const data = await apiFetch(`/api/admin/usuarios/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
  return data;
};

/**
 * Emite una notificación institucional o advertencia administrativa a un usuario.
 * @param {string|number} id - Identificador del usuario destinatario.
 * @param {Object} payload - { titulo, mensaje, tipo }.
 */
export const enviarNotificacionUsuario = async (id, { titulo, mensaje, tipo = "ADVERTENCIA" }) => {
  const data = await apiFetch(`/api/admin/usuarios/${id}/notificar`, {
    method: "POST",
    body: JSON.stringify({ titulo, mensaje, tipo }),
  });
  return data;
};

/**
 * Obtiene el catálogo completo de entidades públicas adscritas a la red metropolitana.
 */
export const getEntidadesAdmin = async () => {
  const data = await apiFetch("/api/entidades");
  return Array.isArray(data) ? data : data?.entidades || [];
};

/**
 * Registra una nueva entidad pública en la plataforma.
 * @param {Object} datos - Atributos de la entidad (nombre, sigla, ruc, tipo, jurisdiccion, email, telefono).
 */
export const crearEntidad = async (datos) => {
  const data = await apiFetch("/api/entidades", {
    method: "POST",
    body: JSON.stringify(datos),
  });
  return data?.entidad || data;
};

/**
 * Actualiza los datos institucionales de una entidad pública existente.
 * @param {string|number} id - Identificador de la entidad.
 * @param {Object} datos - Nuevos datos de la entidad.
 */
export const actualizarEntidad = async (id, datos) => {
  const data = await apiFetch(`/api/entidades/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
  return data?.entidad || data;
};

/**
 * Modifica el estado operativo (activa / inactiva) de una entidad pública.
 * @param {string|number} id - Identificador de la entidad.
 * @param {boolean} activa - Nuevo estado operativo.
 */
export const cambiarEstadoEntidad = async (id, activa) => {
  const data = await apiFetch(`/api/entidades/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activa, activo: activa }),
  });
  return data?.entidad || data;
};

/**
 * Aprovisiona un nuevo operador técnico adscrito a una entidad pública.
 * @param {Object} payload - { nombres, apellidos, dni, email, password, entidad_id }
 */
export const createOperador = async (payload) => {
  const data = await apiFetch("/api/admin/operadores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data?.operador || data?.usuario || data;
};


