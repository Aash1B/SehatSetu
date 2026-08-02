import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, Bell, User, ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getActiveDoctor, setActiveDoctorId, DOCTORS_LIST, type DoctorProfile } from '../utils/doctorProfile';

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
  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile>(getActiveDoctor());

  useEffect(() => {
    const handleDoctorChange = () => {
      setActiveDoctor(getActiveDoctor());
    };
    window.addEventListener('sehat_doctor_changed', handleDoctorChange);
    return () => window.removeEventListener('sehat_doctor_changed', handleDoctorChange);
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
        <div className="relative">
          <select
            value={activeDoctor.id}
            onChange={(e) => setActiveDoctorId(e.target.value)}
            className="w-full bg-deep-space text-white font-bold text-sm rounded-lg p-2 border border-white/20 focus:outline-none focus:border-habanero appearance-none cursor-pointer pr-8"
          >
            {DOCTORS_LIST.map((doc) => (
              <option key={doc.id} value={doc.id} className="bg-deep-space text-white">
                {doc.name} ({doc.specialization})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-white/70 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <p className="text-xs text-white/60 mt-1.5 truncate">{activeDoctor.specialization}</p>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
