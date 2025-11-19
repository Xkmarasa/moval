import { useState, useEffect } from "react";
import "./CookieBanner.css";

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya ha aceptado o rechazado las cookies
    const cookieConsent = localStorage.getItem("cookie-consent");
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="cookie-banner">
      <div className="cookie-banner__content">
        <div className="cookie-banner__text">
          <h3>Política de Cookies</h3>
          <p>
            Este sitio web utiliza cookies técnicas y de sesión necesarias para el funcionamiento de la plataforma 
            y para mantener su sesión activa. Al continuar utilizando este servicio, usted acepta el uso de estas 
            cookies conforme a nuestra política de privacidad. Puede obtener más información en nuestra sección 
            de políticas internas.
          </p>
        </div>
        <div className="cookie-banner__actions">
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--accept"
            onClick={handleAccept}
          >
            Aceptar todas las cookies
          </button>
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--reject"
            onClick={handleReject}
          >
            Configurar preferencias
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;

