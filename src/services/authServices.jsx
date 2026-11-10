import { apiFetch } from "./api";

// DNIs registrados previamente con el orden apellido-nombre de RENIEC
const LEGACY_INVERTED_RENIEC_DNIS = new Set(["74663928", "73977736", "72758727"]);

/**
 * Obtiene las iniciales del usuario a partir de la primera letra del primer nombre
 * y la primera letra del primer apellido.
 * Ejemplo: "Jean Franco" + "Dávila Grandez" -> "JD"
 */
export const getUserInitials = (user) => {
  if (!user) return "US";

  const cleanWordFirstChar = (str) => {
    if (!str || typeof str !== "string") return "";
    const firstWord = str.trim().split(/\s+/)[0] || "";
    return firstWord.charAt(0).toUpperCase();
  };

  const nombres = (user.nombres || "").trim();
  const apellidos = (user.apellidos || "").trim();

  if (nombres && apellidos) {
    const initialNombre = cleanWordFirstChar(nombres);
    const initialApellido = cleanWordFirstChar(apellidos);
    if (initialNombre && initialApellido) {
      return `${initialNombre}${initialApellido}`;
    }
  }

  const fullName = (user.name || nombres || user.email || "Usuario").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  // Para nombres compuestos (ej. 3 o 4 palabras: PrimerNombre SegundoNombre PrimerApellido SegundoApellido)
  const firstApellidoIndex = parts.length >= 4 ? 2 : 1;
  return `${parts[0][0]}${parts[firstApellidoIndex][0]}`.toUpperCase();
};

/**
 * Normaliza la estructura del usuario para garantizar compatibilidad
 * tanto con el contrato del backend (rol, nombres, entidad_id, dni)
 * como con las vistas del frontend (role, name, entityId, initials).
 */
export const normalizeUser = (user) => {
  if (!user) return null;

  const cleanDni = user.dni ? String(user.dni).trim() : "";
  let rawNombres = (user.nombres || "").trim();
  let rawApellidos = (user.apellidos || "").trim();

  // Corregir orden visual si el registro histórico provino de full_name de RENIEC invertido
  if (
    cleanDni &&
    LEGACY_INVERTED_RENIEC_DNIS.has(cleanDni) &&
    rawNombres &&
    rawApellidos &&
    rawNombres === rawNombres.toUpperCase() &&
    rawApellidos === rawApellidos.toUpperCase()
  ) {
    const temp = rawNombres;
    rawNombres = rawApellidos;
    rawApellidos = temp;
  }

  const fullName = rawNombres
    ? `${rawNombres} ${rawApellidos}`.trim()
    : user.name || user.email || "Usuario";

  const initials = getUserInitials({
    nombres: rawNombres,
    apellidos: rawApellidos,
    name: fullName,
    email: user.email,
  });

  return {
    ...user,
    id: user.id || user._id,
    dni: cleanDni,
    email: user.email,
    nombres: rawNombres || user.name || "",
    apellidos: rawApellidos,
    name: fullName,
    initials,
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
export const registerCitizen = async ({
  dni,
  name,
  email,
  password,
  nombres: nombresExplicitos = "",
  apellidos = "",
}) => {
  let nombres = nombresExplicitos.trim() || (name || "").trim();
  let apellidosFinal = apellidos.trim();

  if (!apellidosFinal && nombres.includes(" ")) {
    const parts = nombres.split(/\s+/).filter(Boolean);
    if (parts.length === 2) {
      nombres = parts[0];
      apellidosFinal = parts[1];
    } else if (parts.length >= 3) {
      // Asumir los últimos 2 tokens como apellidos paterno y materno
      nombres = parts.slice(0, parts.length - 2).join(" ");
      apellidosFinal = parts.slice(parts.length - 2).join(" ");
    }
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
    mensaje: data?.mensaje,
    user: normalizeUser(data?.user || data),
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

