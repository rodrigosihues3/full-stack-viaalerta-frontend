// Credenciales de prueba para el avance
const MOCK_USERS = [
  {
    id: "usr-001",
    email: "operador@mml.gob.pe",
    password: "Password123!",
    name: "Carlos Mendoza",
    role: "OPERADOR_MUNICIPAL",
    entity: "Municipalidad Metropolitana de Lima",
  },
  {
    id: "usr-002",
    email: "admin@sedapal.com.pe",
    password: "Password123!",
    name: "Ana Morales",
    role: "OPERADOR_ENTIDAD",
    entity: "Sedapal",
  },
];

// Generador de JWT sintético estructurado (Header.Payload.Signature)
const generateMockJWT = (user) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      entity: user.entity,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 horas de validez
    }),
  );
  const signature = btoa("mock_signature_hash_via_alerta");
  return `${header}.${payload}.${signature}`;
};

export const login = async (email, password) => {
  // Simulación de latencia de red (800ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  const user = MOCK_USERS.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );

  if (!user) {
    throw new Error(
      "Credenciales inválidas. Verifique su correo institucional y contraseña.",
    );
  }

  const token = generateMockJWT(user);
  const sessionData = {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      entity: user.entity,
    },
  };

  return sessionData;
};
