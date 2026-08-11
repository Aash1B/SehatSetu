import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ServicesSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { t: tButtons } = useTranslation('buttons');

  const services = [
    {
      id: "lab_nearby",
      title: t("servicesSection.labTestsNearby.title"),
      description: t("servicesSection.labTestsNearby.description"),
      icon: "/Lab Tests Nearby-nobg.png",
      route: "google",
    },
    {
      id: "specialist",
      title: t("servicesSection.specialistReferral.title"),
      description: t("servicesSection.specialistReferral.description"),
      icon: "/Specialist Referral-nobg.png",
      route: "/patient/book/new",
    },
    {
      id: "emergency",
      title: t("servicesSection.emergencyCare.title"),
      description: t("servicesSection.emergencyCare.description"),
      icon: "/Emergency Care-nobg.png",
      route: "/patient/search?emergency=true",
    },
  ];

  const handleCardClick = (id: string, route: string) => {
    if (id === "lab_nearby") {
      window.open("https://www.google.com/maps/search/?api=1&query=lab+tests+nearby", "_blank", "noopener,noreferrer");
      return;
    }
    if (id === "emergency") {
      const floatingEmergencyBtn = document.querySelector(".floating-emergency-btn") as HTMLButtonElement;
      if (floatingEmergencyBtn) {
        floatingEmergencyBtn.click();
      } else {
        window.location.href = "tel:102";
      }
      return;
    }
    navigate(route);
  };

  return (
    <section id="services" className="services-section">
      <div className="services-container">
        <div className="services-header">
          <div>
            <span className="section-subtag">{t("servicesSection.careFitsYourLife")}</span>
            <h2 className="services-title">{t("servicesSection.services")}</h2>
          </div>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div
              key={service.id}
              className="service-card"
              style={{ cursor: "pointer" }}
              onClick={() => handleCardClick(service.id, service.route)}
            >
              <div className="service-icon-box">
                <img src={service.icon} alt={service.title} style={{ width: 72, height: 72, objectFit: 'contain', display: 'block' }} />
              </div>
              <h3 className="service-card-title">{service.title}</h3>
              <p className="service-card-desc">{service.description}</p>
              <button
                type="button"
                className="service-learn-more"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(service.id, service.route);
                }}
              >
                {tButtons("learnMore")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
