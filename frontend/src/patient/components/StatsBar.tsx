import React from "react";
import { useTranslation } from "react-i18next";

const StatsBar: React.FC = () => {
  const { t } = useTranslation("home");

  const stats = [
    { value: "50,000+", label: t("stats.patientsServed") },
    { value: "1,200+", label: t("stats.certifiedDoctors") },
    { value: "98%", label: t("stats.patientSatisfaction") },
    { value: "24/7", label: t("stats.supportAvailable") },
  ];

  return (
    <section className="stats-bar-section">
      <div className="stats-bar-container">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;
