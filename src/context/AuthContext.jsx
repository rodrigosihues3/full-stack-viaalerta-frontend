import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  login as loginService,
  verify2FA as verify2FAService,
  activate2FA as activate2FAService,
  disable2FA as disable2FAService,
} from "../services/authServices";
import { disconnectSocket } from "../services/socketService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("via_alerta_token"));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("via_alerta_user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("via_alerta_token");
      localStorage.removeItem("via_alerta_user");
      return null;
    }
  });
  const [tempToken, setTempToken] = useState(null);
  const [loading] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setTempToken(null);
    disconnectSocket();
    localStorage.removeItem("via_alerta_token");
    localStorage.removeItem("via_alerta_user");
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("via_alerta:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("via_alerta:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const login = async (email, password) => {
    const result = await loginService(email, password);

    // Si el backend solicita segundo factor
    if (result.requiere2FA) {
      setTempToken(result.tokenTemporal);
      return { requiere2FA: true };
    }

    // Login directo sin 2FA
    setToken(result.tokenAcceso);
    setUser(result.user);
    setTempToken(null);
    localStorage.setItem("via_alerta_token", result.tokenAcceso);
    localStorage.setItem("via_alerta_user", JSON.stringify(result.user));
    return result.user;
  };

  const completar2FA = async (codigo) => {
    if (!tempToken) {
      throw new Error("No hay una sesión de verificación 2FA activa. Inicie sesión nuevamente.");
    }

    const result = await verify2FAService(tempToken, codigo);
    setToken(result.tokenAcceso);
    setUser(result.user);
    setTempToken(null);
    localStorage.setItem("via_alerta_token", result.tokenAcceso);
    localStorage.setItem("via_alerta_user", JSON.stringify(result.user));
    return result.user;
  };

  const cancelar2FA = () => {
    setTempToken(null);
  };

  const marcar2FAActivo = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, dos_pasos_activo: true };
      localStorage.setItem("via_alerta_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const activar2FA = async (codigo) => {
    const result = await activate2FAService(codigo);
    marcar2FAActivo();
    return result;
  };

  const desactivar2FA = async () => {
    const result = await disable2FAService();
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, dos_pasos_activo: false };
      localStorage.setItem("via_alerta_user", JSON.stringify(updated));
      return updated;
    });
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tempToken,
        isAuthenticated: !!token,
        loading,
        login,
        completar2FA,
        cancelar2FA,
        logout,
        marcar2FAActivo,
        activar2FA,
        desactivar2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
