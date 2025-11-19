import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "moval-auth-user";
const API_BASE =
  process.env.REACT_APP_FUNCTIONS_BASE ||
  "https://us-central1-moval-fff66.cloudfunctions.net";

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Unable to parse stored user", error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async ({ usuario, contraseña }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contraseña }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Credenciales inválidas");
      }

      setUser(payload.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.user));
      return payload.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const role =
    user?.rol ||
    user?.role ||
    (user?.nombre === "admin" || user?.usuario === "admin" ? "admin" : "user");

  const value = useMemo(
      () => ({
        user,
        role,
        loading,
        error,
        login,
        logout,
        apiBase: API_BASE,
      }),
      [user, role, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

