import React from 'react';
import StatCard from '../StatCard';
import { ProfessionalStats } from '../../types/profile.types';
import { Calendar, CheckSquare, Star, Users, Video } from 'lucide-react';

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
        title="Average Rating"
        value={
          <div className="flex items-baseline gap-1">
            {stats.averageRating}
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </div>
        }
        subtitle="From patient reviews"
        icon={Star}
        iconColorClass="text-yellow-500"
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
