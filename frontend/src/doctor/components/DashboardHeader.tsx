import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Doctor } from '../../types';

export interface DashboardHeaderProps {
  doctor: Doctor;
  date: string;
  notificationCount?: number;
  className?: string;
}

const mockNotifications = [
  { id: '1', text: 'New appointment request from Ramesh Kumar', time: '10 min ago' },
  { id: '2', text: 'New appointment request from Sunita Devi', time: '25 min ago' },
  { id: '3', text: 'New appointment request from Arjun Singh', time: '1 hr ago' },
];

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  doctor,
  date,
  notificationCount = mockNotifications.length,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className={cn("flex justify-between items-start mb-8", className)}>
      <div>
        <p className="text-aster-blue text-sm font-medium mb-1">{date}</p>
        <div className="flex items-end gap-3 mb-2">
          <h1 className="text-3xl font-bold text-deep-space">Namaste, {doctor.name} 🙏</h1>
          {doctor.specialization && (
            <span className="text-sm font-medium bg-habanero/10 text-habanero px-3 py-1 rounded-full mb-1">
              {doctor.specialization}
            </span>
          )}
        </div>
        <p className="text-gray-500">Here's your care overview for today.</p>
      </div>
      
      <div className="flex items-center gap-4 relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-jodhpur-tan/30 text-aster-blue hover:text-deep-space transition-colors focus:outline-none focus:ring-2 focus:ring-habanero/50"
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-habanero border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold shadow-sm">
              {notificationCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-12 right-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-deep-space text-sm">Recent Appointments</h3>
              <span className="text-xs text-habanero font-medium cursor-pointer hover:underline">Mark all read</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {mockNotifications.map(notif => (
                <div key={notif.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                  <p className="text-sm text-deep-space font-medium leading-snug">{notif.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-center border-t border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-xs text-blue-600 font-bold">View All Appointments</span>
            </div>
          </div>
        )}

        <div className="w-10 h-10 rounded-full bg-deep-space text-white flex items-center justify-center font-bold">
          {doctor.initials}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
