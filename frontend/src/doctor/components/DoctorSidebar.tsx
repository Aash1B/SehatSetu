import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getActiveDoctor, type DoctorProfile } from '../utils/doctorProfile';
import { getToken, getUser } from '../../auth/authStorage';

export interface DoctorSidebarProps {
  className?: string;
}

const navItems = [
  { name: 'Home', path: '/doctor/dashboard', icon: Home },
  { name: 'Patients', path: '/doctor/consultations', icon: Users },
  { name: 'Availability', path: '/doctor/availability', icon: Calendar },
  { name: 'Profile', path: '/doctor/profile', icon: User },
];

const DoctorSidebar: React.FC<DoctorSidebarProps> = ({ className }) => {
  const storedUser = getUser();
  const fallback = getActiveDoctor();
  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile>({
    ...fallback,
    name: storedUser?.fullName || fallback.name,
    initials: (storedUser?.fullName || fallback.name).split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
  });

  useEffect(() => {
    fetch('/api/doctors/me', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((profile) => {
        const name = profile.name || profile.user?.fullName || storedUser?.fullName || 'Doctor';
        setActiveDoctor({ id: profile.id, name, specialization: profile.specialty || 'General Physician', initials: name.split(/\s+/).filter(Boolean).map((part: string) => part[0]).slice(0, 2).join('').toUpperCase() });
      })
      .catch(() => undefined);
  }, []);

  return (
    <aside className={cn("shrink-0 w-64 bg-deep-space border-r border-jodhpur-tan/30 flex flex-col justify-between hidden md:flex h-full", className)}>
      <div>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-habanero text-white flex items-center justify-center font-bold text-xl leading-none pt-1">
            s
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Sehat Setu</span>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col gap-2 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors relative",
                  isActive
                    ? "bg-habanero/20 text-habanero"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" />
                  {item.name}
                  {isActive && (
                    <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-habanero"></span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Active Doctor Selector */}
      <div className="p-4 m-4 bg-white/10 rounded-xl">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1">Doctor Account</p>
        <div className="rounded-lg border border-white/15 bg-white/5 p-2.5 text-sm font-bold text-white">{activeDoctor.name}</div>
        <p className="text-xs text-white/60 mt-1.5 truncate">{activeDoctor.specialization}</p>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
