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
    dos_pasos_activo: Boolean(
      user.dos_pasos_activo ?? user.dosPasosActivo ?? user.twoFactorEnabled
    ),
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
 * Solicita la configuración de autenticación en dos pasos (2FA).
 * Realiza una llamada autenticada POST /api/auth/2fa/configurar.
 * Retorna { secreto, uri, qr, mensaje }.
 */
export const setup2FA = async () => {
  const data = await apiFetch("/api/auth/2fa/configurar", {
    method: "POST",
  });

  if (data?.secreto) {
    try {
      localStorage.setItem("via_alerta_2fa_secret", data.secreto);
    } catch (e) {
      console.error("Error al persistir semilla Base32:", e);
    }
  }

  return {
    secreto: data?.secreto,
    uri: data?.uri,
    qr: data?.qr,
    mensaje: data?.mensaje || "Configuración 2FA inicializada con éxito",
    ...data,
  };
};

/**
 * Envía el primer código TOTP de 6 dígitos para consolidar y activar 2FA.
 * Realiza una llamada autenticada POST /api/auth/2fa/activar enviando { codigo: String(codigo).trim() }.
 * Retorna la respuesta del backend y actualiza el objeto en localStorage fijando dos_pasos_activo = true.
 */
export const activate2FA = async (codigo) => {
  const data = await apiFetch("/api/auth/2fa/activar", {
    method: "POST",
    body: JSON.stringify({
      codigo: String(codigo).trim(),
    }),
  });

  try {
    const rawStored = localStorage.getItem("via_alerta_user");
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      parsed.dos_pasos_activo = true;
      localStorage.setItem("via_alerta_user", JSON.stringify(parsed));
    }
  } catch (err) {
    console.error("Error al actualizar dos_pasos_activo en localStorage:", err);
  }

  return data;
};

/**
 * Desactiva la autenticación en dos pasos (2FA).
 * Realiza una llamada autenticada POST /api/auth/2fa/desactivar enviando el código TOTP de 6 dígitos.
 * Actualiza el objeto en localStorage (via_alerta_user) fijando dos_pasos_activo = false.
 * Retorna la respuesta del backend.
 */
export const disable2FA = async (codigo) => {
  const data = await apiFetch("/api/auth/2fa/desactivar", {
    method: "POST",
    body: JSON.stringify({
      codigo: String(codigo).trim(),
    }),
  });

  try {
    const rawStored = localStorage.getItem("via_alerta_user");
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      parsed.dos_pasos_activo = false;
      localStorage.setItem("via_alerta_user", JSON.stringify(parsed));
    }
    localStorage.removeItem("via_alerta_2fa_secret");
  } catch (err) {
    console.error("Error al actualizar dos_pasos_activo en localStorage:", err);
  }

  return data;
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

/**
 * Consulta información de un DNI mediante el proxy del backend (/api/auth/reniec/:dni).
 * Evita bloqueos CORS y maneja errores de forma resiliente.
 * @param {string} dni - Número de documento de 8 dígitos.
 * @returns {Promise<{ dni: string, nombres?: string, apellidos?: string, nombreCompleto?: string } | null>}
 */
export const consultarDniDecolecta = async (dni) => {
  try {
    const data = await apiFetch(`/api/auth/reniec/${dni}`);
    return data; // { dni, nombres, apellidos, nombreCompleto }
  } catch (err) {
    console.warn("Consulta de DNI no disponible:", err.message);
    return null;
  }
};

