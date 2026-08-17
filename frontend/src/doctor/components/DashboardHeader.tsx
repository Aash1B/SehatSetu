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
    <header className={cn("flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-6", className)}>
      <div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[58px] font-black tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF9933] via-[#D4AC0D] to-[#138808] font-black inline-block">
            Namaste
          </span>
          <span className="text-[#0f172a] font-extrabold">, {doctor.name}</span>
          <img
            src="/Nam.png"
            alt="Namaste"
            className="w-12 h-12 sm:w-20 sm:h-20 md:w-28 md:h-28 lg:w-[120px] lg:h-[120px] object-contain inline-block -ml-2 sm:-ml-4 align-middle transition-transform hover:scale-105"
          />
        </h1>
      </div>

    </header>
  );
};

export default DashboardHeader;
