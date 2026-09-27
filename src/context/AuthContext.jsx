import { createContext, useContext, useState, useEffect } from "react";
import { login as loginService } from "../services/authServices";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehidratación de sesión al recargar la aplicación
    const storedToken = localStorage.getItem("via_alerta_token");
    const storedUser = localStorage.getItem("via_alerta_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error al rehidratar sesión:", error);
        localStorage.removeItem("via_alerta_token");
        localStorage.removeItem("via_alerta_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await loginService(email, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("via_alerta_token", data.token);
    localStorage.setItem("via_alerta_user", JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("via_alerta_token");
    localStorage.removeItem("via_alerta_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
