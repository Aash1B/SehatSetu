import React from 'react';
import { Home, Users, Calendar, Bell, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface DoctorSidebarProps {
  className?: string;
}

const navItems = [
  { name: 'Home', path: '/doctor/dashboard', icon: Home },
  { name: 'Patients', path: '/doctor/consultations', icon: Users },
  { name: 'Profile', path: '/doctor/profile', icon: User },
];

const DoctorSidebar: React.FC<DoctorSidebarProps> = ({ className }) => {
  return (
    <aside className={cn("w-64 bg-deep-space border-r border-jodhpur-tan/30 flex flex-col justify-between hidden md:flex h-full", className)}>
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

      {/* Doctor Snippet */}
      <div className="p-4 m-4 bg-white/10 rounded-xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white text-deep-space flex items-center justify-center font-bold text-sm shrink-0">
          DS
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">Dr. Sharma</p>
          <p className="text-xs text-white/60 truncate">General Physician</p>
        </div>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
