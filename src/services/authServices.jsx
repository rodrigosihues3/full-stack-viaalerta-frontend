import { apiFetch } from "./api";

/**
 * Normaliza la estructura del usuario para garantizar compatibilidad
 * tanto con el contrato del backend (rol, nombres, entidad_id)
 * como con las vistas del frontend (role, name, entityId).
 */
export const normalizeUser = (user) => {
  if (!user) return null;
  const fullName = user.nombres
    ? `${user.nombres} ${user.apellidos || ""}`.trim()
    : user.name || user.email || "Usuario";

  return {
    ...user,
    id: user.id || user._id,
    dni: user.dni || "",
    email: user.email,
    nombres: user.nombres || user.name || "",
    apellidos: user.apellidos || "",
    name: fullName,
    rol: user.rol || user.role,
    role: user.rol || user.role,
    entidad_id: user.entidad_id || user.entityId || null,
    entityId: user.entidad_id || user.entityId || null,
    entityName: user.entidad_nombre || user.entityName || null,
    jurisdiction: user.jurisdiccion || user.jurisdiction || null,
  };
};

/**
 * Inicia sesión enviando credenciales a /api/auth/login.
 * Retorna tokenAcceso y usuario normalizado, o { requiere2FA: true, tokenTemporal }.
 */
export const login = async (emailOrIdentifier, password) => {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: emailOrIdentifier.trim(),
      password,
    }),
  });

  if (data.requiere2FA) {
    return {
      requiere2FA: true,
      tokenTemporal: data.tokenTemporal,
    };
  }

  return {
    tokenAcceso: data.tokenAcceso || data.token,
    user: normalizeUser(data.user),
  };
};

/**
 * Verifica el código TOTP de 6 dígitos ante el backend.
 */
export const verify2FA = async (tokenTemporal, codigo) => {
  const data = await apiFetch("/api/auth/2fa/verificar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenTemporal}`,
    },
    body: JSON.stringify({
      codigo: String(codigo).trim(),
    }),
  });

  return {
    tokenAcceso: data.tokenAcceso || data.token,
    user: normalizeUser(data.user),
  };
};

/**
 * Registra un nuevo ciudadano ante el backend.
 */
export const registerCitizen = async ({ dni, name, email, password, apellidos = "" }) => {
  // Si no se pasaron apellidos separados, inferir del nombre
  let nombres = name.trim();
  let apellidosFinal = apellidos.trim();

  if (!apellidosFinal && nombres.includes(" ")) {
    const parts = nombres.split(" ");
    nombres = parts.slice(0, Math.ceil(parts.length / 2)).join(" ");
    apellidosFinal = parts.slice(Math.ceil(parts.length / 2)).join(" ");
  }

  const data = await apiFetch("/api/auth/registro", {
    method: "POST",
    body: JSON.stringify({
      dni: dni.trim(),
      email: email.trim().toLowerCase(),
      password,
      nombres,
      apellidos: apellidosFinal || "Ciudadano",
    }),
  });

  return {
    mensaje: data.mensaje,
    user: normalizeUser(data.user),
  };
};

/**
 * Consulta el perfil del usuario autenticado.
 */
export const getProfile = async () => {
  const data = await apiFetch("/api/auth/perfil");
  return normalizeUser(data.user);
};

/**
 * Cuentas demo de referencia rápida para facilitar pruebas en el login.
 */
export const getDemoAccounts = () => [
  {
    label: "Ciudadano (Sin 2FA)",
    id: "ciudadano@correo.pe",
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
