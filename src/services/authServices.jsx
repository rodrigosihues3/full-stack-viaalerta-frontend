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
    id: "usr-mml-01",
    identifier: "operador@mml.gob.pe",
    dni: "40192834",
    email: "operador@mml.gob.pe",
    password: "Password123!",
    name: "Carlos Mendoza (MML)",
    role: "OPERADOR_ENTIDAD",
    entityId: "ENT-MML",
    entityName: "Municipalidad Metropolitana de Lima",
  },
  {
    id: "usr-sedapal-01",
    identifier: "admin@sedapal.com.pe",
    dni: "41928374",
    email: "admin@sedapal.com.pe",
    password: "Password123!",
    name: "Ing. Ana Morales (Sedapal)",
    role: "OPERADOR_ENTIDAD",
    entityId: "ENT-SEDAPAL",
    entityName: "Sedapal",
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
    id: "operador@mml.gob.pe",
    pass: "Password123!",
    role: "OPERADOR_ENTIDAD",
  },
  {
    label: "Operador Sedapal",
    id: "admin@sedapal.com.pe",
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
