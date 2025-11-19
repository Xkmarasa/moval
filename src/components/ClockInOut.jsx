import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "dk-hours-log";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `entry-${Date.now()}`;

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hrs) return `${mins} min`;
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
};

const ClockInOut = () => {
  const [entries, setEntries] = useState(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [currentShift, setCurrentShift] = useState(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(`${STORAGE_KEY}-active`);
    return stored ? JSON.parse(stored) : null;
  });
  const [note, setNote] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    if (currentShift) {
      localStorage.setItem(`${STORAGE_KEY}-active`, JSON.stringify(currentShift));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}-active`);
    }
  }, [currentShift]);

  const handleClockIn = () => {
    if (currentShift) return;
    setCurrentShift({
      id: createId(),
      start: Date.now(),
      note: note.trim(),
    });
    setNote("");
  };

  const handleClockOut = () => {
    if (!currentShift) return;
    const end = Date.now();
    const duration = Math.max(1, Math.round((end - currentShift.start) / 60000));
    setEntries((prev) => [
      {
        ...currentShift,
        end,
        duration,
      },
      ...prev,
    ]);
    setCurrentShift(null);
  };

  const handleReset = () => {
    if (window.confirm("¿Eliminar todos los registros?")) {
      setEntries([]);
      setCurrentShift(null);
    }
  };

  const totalToday = useMemo(() => {
    const today = new Date().toDateString();
    return entries
      .filter((entry) => new Date(entry.end).toDateString() === today)
      .reduce((acc, entry) => acc + entry.duration, 0);
  }, [entries]);

  const quickNotes = ["Producción", "Montaje", "Capacitación"];

  return (
    <div className="clock-panel">
      <div className="clock-panel__status">
        <div>
          <p className="label">Estado actual</p>
          <h3>{currentShift ? "Jornada en curso" : "Sin registrar"}</h3>
        </div>
        <div>
          <p className="label">Horas de hoy</p>
          <h3>{formatDuration(totalToday)}</h3>
        </div>
      </div>

      <div className="clock-panel__controls">
        <textarea
          placeholder="Añade una nota o tarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="quick-notes">
          {quickNotes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setNote(item)}
              className="chip"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="clock-panel__buttons">
          <button
            type="button"
            className="dk-btn dk-btn--primary"
            onClick={handleClockIn}
            disabled={Boolean(currentShift)}
          >
            Iniciar jornada
          </button>
          <button
            type="button"
            className="dk-btn dk-btn--secondary"
            onClick={handleClockOut}
            disabled={!currentShift}
          >
            Finalizar
          </button>
          <button type="button" className="dk-btn dk-btn--ghost" onClick={handleReset}>
            Limpiar registros
          </button>
        </div>
        {currentShift && (
          <p className="clock-panel__active">
            Iniciado a las {formatTime(currentShift.start)}
            {currentShift.note && ` · ${currentShift.note}`}
          </p>
        )}
      </div>

      <div className="clock-panel__history">
        <div className="clock-panel__history-header">
          <p>Historial reciente</p>
          <span>{entries.length} registros</span>
        </div>
        {entries.length === 0 ? (
          <p className="clock-panel__empty">
            Aún no hay registros. Empieza iniciando una jornada.
          </p>
        ) : (
          <ul>
            {entries.slice(0, 7).map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{formatDuration(entry.duration)}</strong>
                  <span>
                    {formatTime(entry.start)} - {formatTime(entry.end)}
                  </span>
                </div>
                <p>{entry.note || "Sin nota"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ClockInOut;

