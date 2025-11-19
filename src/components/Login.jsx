import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login, loading, error } = useAuth();
  const [form, setForm] = useState({ usuario: "", contraseña: "" });
  const [formError, setFormError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    if (!form.usuario || !form.contraseña) {
      setFormError("Completa usuario y contraseña.");
      return;
    }

    try {
      await login(form);
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="login-layout">
      <div className="login-card">
        <div>
          <p className="eyebrow">Acceso interno</p>
          <h1>Control de horas</h1>
          <p className="login-card__subtitle">
            Ingresa tus credenciales para acceder al panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-card__form">
          <label>
            <span>Usuario</span>
            <input
              type="text"
              name="usuario"
              value={form.usuario}
              onChange={handleChange}
              autoComplete="username"
              placeholder="ej. supervisor01"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              name="contraseña"
              value={form.contraseña}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          {(formError || error) && (
            <p className="login-card__error">{formError || error}</p>
          )}

          <button type="submit" className="dk-btn dk-btn--primary" disabled={loading}>
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

