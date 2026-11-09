import { io } from "socket.io-client";
import { API_URL } from "./api";

let socketInstance = null;

/**
 * Obtiene o inicializa la instancia de Socket.IO con el token de acceso actual.
 * @param {string} [tokenOverride] Token opcional; si no se provee, se toma de localStorage.
 * @returns {Socket}
 */
export const getSocket = (tokenOverride) => {
  const token = tokenOverride || localStorage.getItem("via_alerta_token");

  // Si ya existe socket y está conectado, verificar si el token cambió
  if (socketInstance) {
    if (token && socketInstance.auth?.token !== token) {
      socketInstance.auth = { token };
      socketInstance.disconnect().connect();
    }
    return socketInstance;
  }

  socketInstance = io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  socketInstance.on("connect", () => {
    console.log("Conectado a Socket.IO de VíaAlerta:", socketInstance.id);
  });

  socketInstance.on("connect_error", (error) => {
    console.warn("Advertencia de conexión Socket.IO:", error.message);
  });

  return socketInstance;
};

/**
 * Desconecta la instancia actual de Socket.IO (ej. al cerrar sesión).
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

