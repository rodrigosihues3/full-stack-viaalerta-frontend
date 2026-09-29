// Catálogo institucional de entidades públicas
export const ENTITIES = {
  MML: {
    id: "ENT-MML",
    name: "Municipalidad Metropolitana de Lima",
    shortName: "MML Obras Públicas",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SEDAPAL: {
    id: "ENT-SEDAPAL",
    name: "Servicio de Agua Potable y Alcantarillado de Lima",
    shortName: "Sedapal",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
};

// Catálogo de categorías viales y mapeo determinista a la entidad responsable
export const INCIDENT_CATEGORIES = [
  {
    id: "CAT-01",
    name: "Bache o hundimiento de asfalto",
    entityId: "ENT-MML",
    iconName: "Cone",
    defaultSeverity: "Alta",
  },
  {
    id: "CAT-02",
    name: "Rotura de vereda o calzada peatonal",
    entityId: "ENT-MML",
    iconName: "AlertTriangle",
    defaultSeverity: "Media",
  },
  {
    id: "CAT-03",
    name: "Tapa de buzón sustraída / colapsada",
    entityId: "ENT-SEDAPAL",
    iconName: "CircleDot",
    defaultSeverity: "Critica",
  },
  {
    id: "CAT-04",
    name: "Fuga de agua con aniego en calzada",
    entityId: "ENT-SEDAPAL",
    iconName: "Droplets",
    defaultSeverity: "Alta",
  },
  {
    id: "CAT-05",
    name: "Otros incidentes",
    entityId: "ENT-MML",
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
    badge: "bg-red-100 text-red-800 border-red-300",
  },
};

// Datos semilla de incidentes en Lima Metropolitana
export const INITIAL_INCIDENTS = [
  {
    id: "inc-101",
    ticketNumber: "TKT-2026-0891",
    categoryId: "CAT-03",
    categoryName: "Tapa de buzón sustraída / colapsada",
    entityId: "ENT-SEDAPAL",
    entityName: "Sedapal",
    district: "San Juan de Lurigancho",
    address: "Av. Próceres de la Independencia 1420",
    lat: -12.00312,
    lng: -77.00451,
    severity: "Critica",
    status: "REGISTRADO",
    createdAt: "2026-09-28 10:14",
    citizenDni: "74839201",
    description:
      "Buzón de alcantarillado sin tapa en carril central. Peligro inminente de despiste vehicular.",
    photoUrl:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "inc-102",
    ticketNumber: "TKT-2026-0890",
    categoryId: "CAT-01",
    categoryName: "Bache o hundimiento de asfalto",
    entityId: "ENT-MML",
    entityName: "Municipalidad Metropolitana de Lima",
    district: "Cercado de Lima",
    address: "Av. Nicolás de Piérola cruce con Jr. Lampa",
    lat: -12.05141,
    lng: -77.03212,
    severity: "Alta",
    status: "EVALUACION",
    createdAt: "2026-09-28 09:30",
    citizenDni: "45892011",
    description:
      "Hundimiento pronunciado de carpeta asfáltica de aprox. 1.2m de ancho tras obras no compactadas.",
    photoUrl:
      "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "inc-103",
    ticketNumber: "TKT-2026-0887",
    categoryId: "CAT-04",
    categoryName: "Fuga de agua con aniego en calzada",
    entityId: "ENT-SEDAPAL",
    entityName: "Sedapal",
    district: "Villa El Salvador",
    address: "Av. Revolución sector 2 grupo 15",
    lat: -12.20811,
    lng: -76.93821,
    severity: "Alta",
    status: "REPARACION",
    createdAt: "2026-09-27 16:45",
    citizenDni: "73232323",
    description:
      "Rotura de tubería matriz generando aniego que cubre dos carriles de tránsito pesado.",
    photoUrl: null,
  },
  {
    id: "inc-104",
    ticketNumber: "TKT-2026-0882",
    categoryId: "CAT-02",
    categoryName: "Rotura de vereda o calzada peatonal",
    entityId: "ENT-MML",
    entityName: "Municipalidad Metropolitana de Lima",
    district: "Comas",
    address: "Av. Túpac Amaru km 11",
    lat: -11.9324,
    lng: -77.05412,
    severity: "Media",
    status: "RESUELTO",
    createdAt: "2026-09-26 11:20",
    citizenDni: "73232323",
    description:
      "Vereda destruida impidiendo paso peatonal de adultos mayores frente a posta médica.",
    photoUrl: null,
  },
];

// Almacén en memoria durante la ejecución de la sesión
let incidentsStore = [...INITIAL_INCIDENTS];

export const getIncidents = () => [...incidentsStore];

export const getIncidentsByEntity = (entityId) => {
  return incidentsStore.filter((i) => i.entityId === entityId);
};

export const getIncidentsByCitizenDni = (dni) => {
  return incidentsStore.filter((i) => i.citizenDni === dni);
};

export const updateIncidentStatus = (id, newStatus) => {
  incidentsStore = incidentsStore.map((item) =>
    item.id === id ? { ...item, status: newStatus } : item,
  );
  return incidentsStore.find((i) => i.id === id);
};

export const createIncident = async (newIncidentData) => {
  await new Promise((resolve) => setTimeout(resolve, 600)); // Latencia simulada

  const category = INCIDENT_CATEGORIES.find(
    (item) => item.id === newIncidentData.categoryId,
  );
  if (!category) {
    throw new Error("La categoria del incidente no es valida.");
  }

  const entity = Object.values(ENTITIES).find(
    (item) => item.id === category.entityId,
  );
  const randomTicket = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const createdIncident = {
    id: `inc-${Date.now()}`,
    ticketNumber: randomTicket,
    createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    status: "REGISTRADO",
    ...newIncidentData,
    categoryId: category.id,
    categoryName: category.name,
    entityId: entity.id,
    entityName: entity.name,
    severity: newIncidentData.severity || category.defaultSeverity,
  };

  incidentsStore.unshift(createdIncident);
  return createdIncident;
};
