import { apiFetch } from "./api";

/**
 * Normaliza un objeto incidente para brindar interoperabilidad total
 * entre el contrato REST/WebSocket del backend (snake_case)
 * y los estados/renders del frontend (camelCase).
 */
export const normalizeIncidente = (inc) => {
  if (!inc) return null;
  const id = inc.id || inc._id;
  const ticketNumber =
    inc.folio ||
    inc.ticketNumber ||
    inc.ticket_codigo ||
    inc.codigo_ticket ||
    `TKT-2026-${String(id).slice(-4)}`;
  const usuarioId =
    inc.usuario_creador_id || inc.usuario_id || inc.userId || null;
  const status = (inc.estado || inc.status || "REGISTRADO").toUpperCase();
  const severity = inc.severidad || inc.severity || "Media";
  const lat = Number(inc.latitud ?? inc.lat ?? -12.046374);
  const lng = Number(inc.longitud ?? inc.lng ?? -77.042793);
  const address =
    inc.direccion_referencial || inc.address || "Lima Metropolitana";
  const district = inc.distrito || inc.district || "Cercado de Lima";
  const description =
    inc.observaciones_ciudadano || inc.description || "";
  const photoUrl = inc.foto_url || inc.photoUrl || null;
  const createdAt =
    inc.creado_en ||
    inc.fecha_creacion ||
    inc.createdAt ||
    new Date().toISOString();

  const categoryId =
    inc.categoria_id || inc.categoryId || inc.categoria?.id || "CAT-01";
  const categoryName =
    inc.categoria_nombre ||
    inc.categoryName ||
    inc.categoria?.nombre ||
    "Incidente Vial";

  const entityId =
    inc.entidad_asignada_id ||
    inc.entidad_id ||
    inc.entityId ||
    inc.entidad?.id ||
    null;
  const entityName =
    inc.entidad_nombre ||
    inc.entityName ||
    inc.entidad?.nombre ||
    "Entidad Asignada";

  const aiTriage =
    inc.aiTriage ||
    (inc.ia_diagnostico
      ? {
          detectedIssue: inc.ia_diagnostico,
          confidence:
            typeof inc.ia_confianza === "number"
              ? `${inc.ia_confianza}%`
              : inc.ia_confianza || "90%",
          computedSeverity: inc.ia_severidad || severity,
          recommendation: inc.ia_recomendacion,
        }
      : null);

  return {
    ...inc,
    id,
    ticketNumber,
    folio: ticketNumber,
    ticket_codigo: ticketNumber,
    usuario_id: usuarioId,
    usuario_creador_id: usuarioId,
    status,
    estado: status,
    severity,
    severidad: severity,
    lat,
    latitud: lat,
    lng,
    longitud: lng,
    address,
    direccion_referencial: address,
    district,
    distrito: district,
    description,
    observaciones_ciudadano: description,
    photoUrl,
    foto_url: photoUrl,
    createdAt,
    fecha_creacion: createdAt,
    creado_en: createdAt,
    citizenDni: inc.ciudadano_dni || inc.creador_dni || inc.citizenDni || "",
    categoryId,
    categoria_id: categoryId,
    categoryName,
    categoria_nombre: categoryName,
    entityId,
    entidad_asignada_id: entityId,
    entityName,
    entidad_nombre: entityName,
    confirmaciones_count: inc.confirmaciones_count ?? inc.confirmaciones ?? 0,
    aiTriage,
    ia_diagnostico: inc.ia_diagnostico || aiTriage?.detectedIssue || null,
    ia_confianza: inc.ia_confianza ?? null,
    ia_severidad: inc.ia_severidad || aiTriage?.computedSeverity || null,
    ia_recomendacion: inc.ia_recomendacion || aiTriage?.recommendation || null,
  };
};

/**
 * Obtiene el listado de incidentes desde el backend.
 * Si el usuario es OPERADOR_ENTIDAD, el backend ya filtra por su entidad.
 */
export const getIncidentes = async () => {
  const data = await apiFetch("/api/incidentes");
  const list = Array.isArray(data) ? data : data?.incidentes || [];
  return list.map(normalizeIncidente);
};

/**
 * Registra un nuevo incidente vial (Rol Ciudadano).
 */
export const createIncidente = async (incidentData) => {
  const payload = {
    categoria_id: incidentData.categoria_id || incidentData.categoryId,
    latitud: Number(incidentData.latitud ?? incidentData.lat),
    longitud: Number(incidentData.longitud ?? incidentData.lng),
    direccion_referencial:
      incidentData.direccion_referencial ||
      incidentData.address ||
      "Dirección no especificada",
    distrito:
      incidentData.distrito || incidentData.district || "Lima Metropolitana",
    observaciones_ciudadano:
      incidentData.observaciones_ciudadano ||
      incidentData.description ||
      "",
    foto_url: incidentData.foto_url || incidentData.photoUrl || null,
    severidad: (
      incidentData.severidad ||
      incidentData.severity ||
      "ALTA"
    ).toUpperCase(),
    ia_diagnostico:
      incidentData.ia_diagnostico ||
      incidentData.aiTriage?.detectedIssue ||
      "Incidente vial reportado por ciudadano",
    ia_confianza: Number(
      incidentData.ia_confianza ||
        (incidentData.aiTriage?.confidence
          ? parseFloat(incidentData.aiTriage.confidence)
          : 92.5),
    ),
    ia_severidad: (
      incidentData.ia_severidad ||
      incidentData.aiTriage?.computedSeverity ||
      incidentData.severidad ||
      "ALTA"
    ).toUpperCase(),
    ia_recomendacion:
      incidentData.ia_recomendacion ||
      incidentData.aiTriage?.recommendation ||
      "Inspección técnica requerida",
  };

  const response = await apiFetch("/api/incidentes", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const created = response?.incidente || response;
  return normalizeIncidente(created);
};

/**
 * Actualiza el estado operativo de un incidente (Operador / Admin).
 */
export const updateIncidenteEstado = async (id, { nuevoEstado, motivoDesestimacion, notaObservacion }) => {
  const payload = {
    nuevoEstado: (nuevoEstado || "").toUpperCase(),
    motivoDesestimacion: motivoDesestimacion || null,
    notaObservacion: notaObservacion || null,
  };

  const response = await apiFetch(`/api/incidentes/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  const updated = response?.incidente || response;
  return normalizeIncidente(updated);
};

/**
 * Confirma un incidente reportado previamente (Rol Ciudadano).
 */
export const confirmarIncidente = async (id, { fotoAdicionalUrl } = {}) => {
  const payload = fotoAdicionalUrl ? { fotoAdicionalUrl } : {};
  const response = await apiFetch(`/api/incidentes/${id}/confirmar`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response;
};

/**
 * Obtiene el catálogo de entidades públicas.
 */
export const getEntidades = async () => {
  const data = await apiFetch("/api/entidades");
  return Array.isArray(data) ? data : data?.entidades || [];
};

/**
 * Obtiene el catálogo de categorías viales.
 */
export const getCategorias = async () => {
  const data = await apiFetch("/api/entidades/categorias");
  return Array.isArray(data) ? data : data?.categorias || [];
};

