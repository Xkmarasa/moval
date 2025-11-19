import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import BrandLogo from "./components/BrandLogo";
import ClockInOut from "./components/ClockInOut";

const summary = [
  { label: "Colaboradores activos", value: "42", tone: "primary" },
  { label: "Horas registradas hoy", value: "118h", tone: "accent" },
  { label: "Pendientes por aprobar", value: "3", tone: "warning" },
];

function App() {
  const page = (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__brand">
          <BrandLogo />
          <div>
            <p className="eyebrow">Plataforma interna</p>
            <h1>
              Registro de horas <span>DK Tegoria</span>
            </h1>
            <p>
              Controla entradas y salidas desde un panel claro, pensado para tus
              supervisores y equipo administrativo.
            </p>
          </div>
        </div>

        <div className="hero__summary">
          {summary.map((item) => (
            <article key={item.label} className={`summary-card summary-card--${item.tone}`}>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </header>

      <main className="dashboard">
        <section className="panel panel--primary">
          <div className="panel__header">
            <h2>Registro en vivo</h2>
            <p>Usa el reloj digital para iniciar o finalizar cada turno.</p>
          </div>
          <ClockInOut />
        </section>

        <section className="panel panel--secondary">
          <div className="panel__header">
            <h2>Guía rápida</h2>
            <p>Pasos para un registro correcto.</p>
          </div>
          <ol className="steps">
            <li>Verifica que tus datos estén actualizados en el perfil.</li>
            <li>Inicia la jornada antes de ingresar a producción.</li>
            <li>Agrega notas con área o tarea específica.</li>
            <li>Finaliza al entregar turno y confirma supervisión.</li>
          </ol>
          <div className="panel__cta">
            <p>¿Necesitas ajustar un registro?</p>
            <button className="dk-btn dk-btn--ghost">Contactar a RRHH</button>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <BrandLogo />
        <p>© {new Date().getFullYear()} DK Tegoria · Plataforma de horas</p>
        <div className="footer-links">
          <a href="#politicas">Políticas internas</a>
          <a href="#soporte">Soporte</a>
        </div>
      </footer>
    </div>
  );

  return <AuthProvider>{page}</AuthProvider>;
}

export default App;
