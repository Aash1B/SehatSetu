import React from 'react';
import StatCard from '../StatCard';
import { ProfessionalStats } from '../../types/profile.types';

interface Props {
  stats: ProfessionalStats;
}

const StatisticsGrid: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard
        title="Patients Treated"
        value={stats.patientsTreated}
        subtitle="Unique patients"
        imageSrc="/Patients.png"
      />
      <StatCard
        title="Completed Consultations"
        value={stats.completedConsultations}
        subtitle="Total Successfully Completed"
        imageSrc="/Completed.png"
      />
      <StatCard
        title="Today's Appointments"
        value={stats.todaysAppointments}
        subtitle="Scheduled for today"
        imageSrc="/Today.png"
      />
    </div>
  );
};

export default StatisticsGrid;
