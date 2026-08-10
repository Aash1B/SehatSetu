import React from 'react';
import { useTranslation } from 'react-i18next';

const StatsBar: React.FC = () => {
  const { t } = useTranslation("home");

  const stats = [
    { value: 'Every City', label: t('stats.connectingIndia') || 'Connecting India', icon: '/city-building-logo.png' },
    { value: '1000+', label: t('stats.certifiedDoctors') || 'Verified Doctors', icon: '/doctor-stat-logo.png' },
    { value: '100%', label: t('stats.secureHealthRecord') || 'Secure Health Record', icon: '/shield-stat-logo.png' },
    { value: '24/7', label: t('stats.supportAvailable') || 'SetuAI Chat Assistance Available', icon: '/support-stat-logo.png' },
  ];

  return (
    <section className="stats-bar-section">
      <div className="stats-bar-container">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item flex items-center justify-center">
            {stat.icon ? (
              <div className="flex items-center justify-center gap-3 sm:gap-4 text-left">
                <div className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-indigo-400/30 shadow-md">
                  <img
                    src={stat.icon}
                    alt={stat.value}
                    className="w-full h-full object-cover scale-[1.35]"
                  />
                </div>
                <div>
                  <div className="stat-value text-2xl sm:text-3xl font-extrabold text-white leading-tight">{stat.value}</div>
                  <div className="stat-label text-xs sm:text-sm text-slate-400 font-medium">{stat.label}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;
