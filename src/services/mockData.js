import {
  getIncidentes,
  createIncidente,
  updateIncidenteEstado,
} from "./incidentService";

// Catálogo institucional de entidades públicas para lookup de diseño
export const ENTITIES = {
  MML: {
    id: "ENT-MML-CERCADO",
    name: "Municipalidad de Lima - Sede Cercado",
    shortName: "Obras Públicas",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SEDAPAL: {
    id: "ENT-SEDAPAL-NORTE",
    name: "Servicio de Agua Potable y Alcantarillado de Lima",
    shortName: "Sedapal",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
};

export const INITIAL_ENTITIES = [
  {
    id: "ENT-MML-CERCADO",
    name: "Municipalidad de Lima - Sede Cercado",
    acronym: "MML",
    jurisdiction: "Vialidad Urbana y Redes Metropolitanas",
    email: "operaciones@mml.gob.pe",
    phone: "(01) 632-1300",
    status: "OPERATIVO",
  },
  {
    id: "ENT-SEDAPAL-NORTE",
    name: "Servicio de Agua Potable y Alcantarillado de Lima",
    acronym: "SEDAPAL",
    jurisdiction: "Redes Matrices de Agua y Alcantarillado",
    email: "operaciones@sedapal.com.pe",
    phone: "(01) 317-8000",
    status: "OPERATIVO",
  },
];

// Catálogo de categorías viales y mapeo determinista a la entidad responsable
export const INCIDENT_CATEGORIES = [
  {
    id: "CAT-01",
    name: "Bache o hundimiento de asfalto",
    entityId: "ENT-MML-CERCADO",
    iconName: "Cone",
    defaultSeverity: "Alta",
  },
  {
    id: "CAT-02",
    name: "Rotura de vereda o calzada peatonal",
    entityId: "ENT-MML-CERCADO",
    iconName: "AlertTriangle",
    defaultSeverity: "Media",
  },
  {
    id: "CAT-03",
    name: "Tapa de buzón sustraída / colapsada",
    entityId: "ENT-SEDAPAL-NORTE",
    iconName: "CircleDot",
    defaultSeverity: "Critica",
  },
  {
    id: "CAT-04",
    name: "Fuga de agua con aniego en calzada",
    entityId: "ENT-SEDAPAL-NORTE",
    iconName: "Droplets",
    defaultSeverity: "Alta",
  },
  {
    id: "CAT-05",
    name: "Otros incidentes",
    entityId: "ENT-MML-CERCADO",
    iconName: "HelpCircle",
    defaultSeverity: "Media",
  },
];

// Estados del ciclo de vida de trazabilidad
export const INCIDENT_STATUS = {
  REGISTRADO: {
    label: "Registrado",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
  },
  EVALUACION: {
    label: "En Evaluación",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
  },
  REPARACION: {
    label: "En Reparación",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
  RESUELTO: {
    label: "Resuelto",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  DESESTIMADO: {
    label: "Desestimado",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

// Funciones puente hacia el servicio real
export const getIncidents = async () => {
  return await getIncidentes();
};

export const getIncidentsByEntity = async (entityId) => {
  const incidents = await getIncidentes();
  return incidents.filter((i) => i.entityId === entityId || i.entidad_asignada_id === entityId);
};

export const getIncidentsByCitizenDni = async (dni) => {
  const incidents = await getIncidentes();
  return incidents.filter((i) => i.citizenDni === dni || i.ciudadano_dni === dni);
};

export const updateIncidentStatus = async (id, newStatus) => {
  return await updateIncidenteEstado(id, { nuevoEstado: newStatus });
};

export const createIncident = async (newIncidentData) => {
  return await createIncidente(newIncidentData);
};
