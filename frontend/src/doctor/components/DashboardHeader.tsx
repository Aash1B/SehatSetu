import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { Doctor } from '../../types';
import { getToken } from '../../auth/authStorage';

export interface DashboardHeaderProps {
  doctor: Doctor;
  date: string;
  notificationCount?: number;
  className?: string;
}

export interface NotificationItem {
  id: string;
  text: string;
  time: string;
  route: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  doctor,
  date,
  className
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRealNotifications = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
          const allAppointments = await res.json();
          if (Array.isArray(allAppointments)) {
            const docAppointments = allAppointments;

            const mapped: NotificationItem[] = docAppointments.map((app: any) => {
              const pName = app.patientName || app.patient?.user?.fullName || 'Patient';
              const appDate = app.selectedDate || app.date || 'Today';
              const appTime = app.selectedTimeSlot || app.timeSlot || '10:00 AM';
              return {
                id: String(app.id),
                text: `New appointment booked by ${pName}`,
                time: `${appDate} • ${appTime}`,
                route: '/doctor/consultations',
              };
            });

            setNotifications(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealNotifications();
  }, [doctor?.id]);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications([]);
  };

  const handleNotificationClick = (route: string) => {
    setIsOpen(false);
    navigate(route);
  };

  return (
    <header className={cn("flex justify-between items-start mb-7", className)}>
      <div>
        <p className="text-sm font-normal text-slate-500 mb-1">{date}</p>
        <div className="mb-1.5">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Namaste, {doctor.name}</h1>
        </div>
        <p className="text-base font-normal text-slate-600">Here's your care overview for today.</p>
      </div>
      
      <div className="flex items-center gap-4 relative">
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-habanero/50 cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-habanero border-2 border-white rounded-full flex items-center justify-center text-xs text-white font-bold shadow-sm">
              {notifications.length}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-12 right-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-black text-sm">Booked Appointments</h3>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-habanero font-medium hover:underline cursor-pointer bg-transparent border-0"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-black">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-black">
                  No new booked appointments
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif.route)}
                    className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <p className="text-sm text-black font-medium leading-snug">{notif.text}</p>
                    <p className="text-xs text-black mt-1">{notif.time}</p>
                  </div>
                ))
              )}
            </div>
            <div 
              onClick={() => handleNotificationClick('/doctor/consultations')}
              className="px-4 py-2 text-center border-t border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs text-black font-bold">View All Appointments</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/doctor/profile')}
          className="w-10 h-10 rounded-full bg-deep-space text-black flex items-center justify-center font-bold hover:opacity-90 transition-all cursor-pointer border-0 shadow-sm"
          title="View Doctor Profile"
        >
          {doctor.initials}
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
