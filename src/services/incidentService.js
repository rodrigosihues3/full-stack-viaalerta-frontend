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
    inc.ticket_folio ||
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
    distanceKm:
      inc.distancia_km !== undefined && inc.distancia_km !== null
        ? Number(inc.distancia_km)
        : inc.distanceKm ?? null,
    distancia_km:
      inc.distancia_km !== undefined && inc.distancia_km !== null
        ? Number(inc.distancia_km)
        : inc.distanceKm ?? null,
    esMio: Boolean(inc.es_mio ?? inc.esMio),
    historial: Array.isArray(inc.historial) ? inc.historial : [],
    confirmaciones: Array.isArray(inc.confirmaciones) ? inc.confirmaciones : [],
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
 * Calcula la distancia geodésica Haversine en kilómetros entre dos coordenadas.
 */
const calculateHaversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Obtiene los incidentes cercanos a las coordenadas del ciudadano desde el backend.
 * Incluye respaldo de cálculo geodésico local en caso de que el servidor remoto
 * aún no tenga desplegada la ruta /api/incidentes/cercanos.
 */
export const getIncidentesCercanos = async ({
  lat,
  lng,
  radio = 10,
  estado = null,
  categoriaId = null,
}) => {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const radioKm = Number(radio) || 10;

  const params = new URLSearchParams({
    lat: String(latNum),
    lng: String(lngNum),
    radio: String(radioKm),
  });
  if (estado && estado !== "TODOS") {
    params.set("estado", estado);
  }
  if (categoriaId && categoriaId !== "TODAS") {
    params.set("categoria_id", categoriaId);
  }

  try {
    const data = await apiFetch(`/api/incidentes/cercanos?${params.toString()}`);
    const list = Array.isArray(data) ? data : data?.incidentes || [];
    return list.map(normalizeIncidente);
  } catch (err) {
    console.warn(
      "Respaldo geodésico activado para incidentes cercanos:",
      err.message
    );
    const allIncidents = await getIncidentes();
    return allIncidents
      .map((inc) => {
        const distanceKm = calculateHaversineKm(
          latNum,
          lngNum,
          Number(inc.lat),
          Number(inc.lng)
        );
        return {
          ...inc,
          distanceKm,
          distancia_km: distanceKm,
        };
      })
      .filter((inc) => {
        if (inc.distanceKm > radioKm) return false;
        if (estado && estado !== "TODOS" && inc.status !== estado) return false;
        if (!estado && inc.status === "DESESTIMADO") return false;
        if (categoriaId && categoriaId !== "TODAS" && inc.categoryId !== categoriaId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
};

/**
 * Obtiene el detalle completo de un incidente por su ID, incluyendo su historial de estados.
 */
export const getIncidenteById = async (id) => {
  const data = await apiFetch(`/api/incidentes/${id}`);
  return normalizeIncidente(data);
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
  const payload = fotoAdicionalUrl
    ? { foto_adicional_url: fotoAdicionalUrl }
    : {};
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

