const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const API_URL = BASE_URL;

/**
 * Cliente HTTP centralizado para la API REST de VíaAlerta.
 * Inyecta automáticamente el token de acceso y maneja errores HTTP y 401.
 */
export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem("via_alerta_token");

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  // Inyectar Authorization si hay token y no se ha definido manualmente
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Manejo de respuesta vacía o no JSON
  const contentType = response.headers.get("content-type");
  let data;
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  // Manejo centralizado de 401 Unauthorized
  if (response.status === 401) {
    const isAuthEndpoint =
      endpoint.includes("/api/auth/login") ||
      endpoint.includes("/api/auth/2fa/verificar") ||
      endpoint.includes("/api/auth/registro");

    if (!isAuthEndpoint) {
      localStorage.removeItem("via_alerta_token");
      localStorage.removeItem("via_alerta_user");
      window.dispatchEvent(new CustomEvent("via_alerta:unauthorized"));
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.mensaje || data.message || data.error)) ||
      (typeof data === "string" && data.trim()) ||
      `Error HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
