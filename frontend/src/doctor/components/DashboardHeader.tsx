import React from 'react';
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
  // Notification logic removed

  return (
    <header className={cn("flex justify-between items-start mb-7", className)}>
      <div>
        <p className="text-sm font-normal text-slate-500 mb-1">{date}</p>
        <div className="mb-1.5">
          <h1 className="text-4xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <span style={{
              display: 'inline-block',
              background: 'linear-gradient(to right, #FF9933 0%, #138808 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
            }}>Namaste,</span>
            {' '}{doctor.name}
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F4F1EC', borderRadius: '50%', width: '44px', height: '44px', marginLeft: '2px', transform: 'translateY(4px)' }}>
              <img src="/P.jpeg" alt="Namaskar" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%' }} />
            </span>
          </h1>
        </div>
        <p className="text-base font-normal text-slate-600"></p>
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          type="button"
          onClick={() => navigate('/doctor/profile')}
          className="w-16 h-16 rounded-full bg-[#111144] p-0 flex items-end justify-center hover:opacity-90 transition-all cursor-pointer border-0 shadow-sm overflow-hidden shrink-0"
          title="View Doctor Profile"
        >
          <svg viewBox="0 0 100 100" className="w-[75%] h-[75%]" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="39" r="16" fill="#FFFFFF" />
            <path d="M 10 100 C 10 74, 26 60, 50 60 C 74 60, 90 74, 90 100 Z" fill="#FFFFFF" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
