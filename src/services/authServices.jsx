// Catálogo de usuarios semilla con roles diferenciados
const MOCK_ACCOUNTS = [
  {
    id: "usr-admin-01",
    identifier: "admin@viaalerta.gob.pe",
    dni: "00000001",
    email: "admin@viaalerta.gob.pe",
    password: "Password123!",
    name: "Administrador Central",
    role: "SUPER_ADMIN",
    entityId: null,
    entityName: "Gobierno Metropolitano",
  },
  {
    id: "USR-002",
    identifier: "operaciones@mml.gob.pe",
    dni: "40192834",
    email: "operaciones@mml.gob.pe",
    password: "Password123!",
    name: "Centro de Control Vial - Sede Central",
    role: "OPERADOR_ENTIDAD",
    entityId: "ENT-MML-CERCADO",
    entityName: "Municipalidad de Lima - Sede Cercado",
    jurisdiction: "Vialidad Metropolitana",
  },
  {
    id: "USR-003",
    identifier: "operaciones@sedapal.com.pe",
    dni: "41928374",
    email: "operaciones@sedapal.com.pe",
    password: "Password123!",
    name: "Operaciones Técnicas - Sede Lima Centro",
    role: "OPERADOR_ENTIDAD",
    entityId: "ENT-SEDAPAL-NORTE",
    entityName: "Sedapal Norte",
    jurisdiction: "Saneamiento y Redes Primarias",
  },
  {
    id: "usr-citizen-01",
    identifier: "73232323",
    dni: "73232323",
    email: "ciudadano@correo.pe",
    password: "Password123!",
    name: "Ana Torres Meza",
    role: "CIUDADANO",
    entityId: null,
    entityName: null,
  },
];

// Generador de JWT sintético estructurado en Base64URL
const generateSyntheticJWT = (user) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      dni: user.dni,
      email: user.email,
      name: user.name,
      role: user.role,
      entityId: user.entityId,
      entityName: user.entityName,
      jurisdiction: user.jurisdiction,
      exp: Math.floor(Date.now() / 1000) + 8 * 3600, // 8 horas
    }),
  );
  const signature = btoa("mock_vialerta_signature_token");
  return `${header}.${payload}.${signature}`;
};

export const login = async (identifier, password) => {
  await new Promise((resolve) => setTimeout(resolve, 600)); // Latencia de red simulada

  const cleanId = identifier.trim().toLowerCase();
  const user = MOCK_ACCOUNTS.find(
    (u) =>
      (u.identifier.toLowerCase() === cleanId ||
        u.dni === cleanId ||
        u.email.toLowerCase() === cleanId) &&
      u.password === password,
  );

  if (!user) {
    throw new Error(
      "Credenciales inválidas. Verifique su identificador (DNI/correo) o contraseña.",
    );
  }

  const token = generateSyntheticJWT(user);
  return {
    token,
    user: {
      id: user.id,
      dni: user.dni,
      email: user.email,
      name: user.name,
      role: user.role,
      entityId: user.entityId,
      entityName: user.entityName,
      jurisdiction: user.jurisdiction,
    },
  };
};

export const registerCitizen = async ({ dni, name, email, password }) => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const cleanDni = dni.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!/^\d{8}$/.test(cleanDni)) {
    throw new Error("El DNI debe contener exactamente 8 digitos numericos.");
  }

  if (MOCK_ACCOUNTS.some((account) => account.dni === cleanDni)) {
    throw new Error("Ya existe una cuenta registrada con este DNI.");
  }

  const user = {
    id: `usr-citizen-${Date.now()}`,
    identifier: cleanDni,
    dni: cleanDni,
    email: cleanEmail,
    password,
    name: cleanName,
    role: "CIUDADANO",
    entityId: null,
    entityName: null,
  };

  MOCK_ACCOUNTS.push(user);
  const token = generateSyntheticJWT(user);
  return {
    token,
    user: {
      id: user.id,
      dni: user.dni,
      email: user.email,
      name: user.name,
      role: user.role,
      entityId: user.entityId,
      entityName: user.entityName,
    },
  };
};

export const getDemoAccounts = () => [
  {
    label: "Ciudadano (DNI)",
    id: "73232323",
    pass: "Password123!",
    role: "CIUDADANO",
  },
  {
    label: "Operador MML",
    id: "operaciones@mml.gob.pe",
    pass: "Password123!",
    role: "OPERADOR_ENTIDAD",
  },
  {
    label: "Operador Sedapal",
    id: "operaciones@sedapal.com.pe",
    pass: "Password123!",
    role: "OPERADOR_ENTIDAD",
  },
  {
    label: "Super Admin",
    id: "admin@viaalerta.gob.pe",
    pass: "Password123!",
    role: "SUPER_ADMIN",
  },
];
