import React from 'react';

const stats = [
  { value: '50,000+', label: 'Patients Served' },
  { value: '1,200+', label: 'Certified Doctors' },
  { value: '98%', label: 'Patient Satisfaction' },
  { value: '24/7', label: 'Support Available' },
];

const StatsBar: React.FC = () => {
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
