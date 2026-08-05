import React from 'react';
import StatCard from '../StatCard';
import { ProfessionalStats } from '../../types/profile.types';
import { Calendar, CheckSquare, Users, Video } from 'lucide-react';

interface Props {
  stats: ProfessionalStats;
}

const StatisticsGrid: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Consultations"
        value={stats.totalConsultations}
        subtitle="All-time consultations"
        icon={Video}
        iconColorClass="text-aster-blue"
      />
      <StatCard
        title="Patients Treated"
        value={stats.patientsTreated}
        subtitle="Unique patients"
        icon={Users}
        iconColorClass="text-habanero"
      />
      <StatCard
        title="Completed Consultations"
        value={stats.completedConsultations}
        subtitle="Successfully completed"
        icon={CheckSquare}
        iconColorClass="text-emerald-500"
      />
      <StatCard
        title="Today's Appointments"
        value={stats.todaysAppointments}
        subtitle="Scheduled for today"
        icon={Calendar}
        iconColorClass="text-green-500"
      />
    </div>
  );
};

export default StatisticsGrid;
