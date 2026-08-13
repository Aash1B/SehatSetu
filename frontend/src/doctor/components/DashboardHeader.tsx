import React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { Doctor } from '../../types';

export interface DashboardHeaderProps {
  doctor: Doctor;
  date: string;
  notificationCount?: number;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  doctor,
  date,
  className
}) => {
  const navigate = useNavigate();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const showUploadedImage = Boolean(doctor.imageUrl) && !imageLoadFailed;

  useEffect(() => {
    setImageLoadFailed(false);
  }, [doctor.imageUrl]);

  return (
    <header className={cn("flex justify-between items-start mb-2", className)}>
      <div>
        <h1 className="text-5xl md:text-6xl lg:text-[58px] font-black tracking-tight flex items-center gap-2.5">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF9933] via-[#D4AC0D] to-[#138808] font-black inline-block">
            Namaste
          </span>
          <span className="text-[#0f172a] font-extrabold">, {doctor.name}</span>
          <img
            src="/Nam.png"
            alt="Namaste"
            className="w-28 h-28 md:w-32 md:h-32 lg:w-[130px] lg:h-[130px] object-contain inline-block -ml-6 align-middle -rotate-12 transform origin-bottom-center transition-transform hover:-rotate-18"
          />
        </h1>
      </div>

    </header>
  );
};

export default DashboardHeader;
