import React from 'react';
import BrandLogo from '../../common/components/BrandLogo';

export interface DoctorLogoHeaderProps {
  /** Vertical height of the header card e.g. "88px", "96px" */
  height?: string;
  className?: string;
  markWrapperClassName?: string;
  wordmarkClassName?: string;
  accentClassName?: string;
  onClick?: () => void;
}

/**
 * DoctorLogoHeader: Standalone card component for the top-left sidebar header section.
 * Its height, padding, logo size, and text sizing can be dynamically adjusted independently.
 */
const DoctorLogoHeader: React.FC<DoctorLogoHeaderProps> = ({
  height = "120px",
  className = "",
  markWrapperClassName = "w-12 h-12 rounded-md bg-transparent flex items-center justify-center p-0.5",
  wordmarkClassName = "font-extrabold text-4xl text-slate-900 tracking-tight",
  accentClassName = "text-[#314bb5]",
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{ height }}
      className={`px-7 border-b border-slate-200 flex items-center shrink-0 bg-white ${className}`.trim()}
    >
      <BrandLogo
        className="gap-3.5"
        markWrapperClassName={markWrapperClassName}
        wordmarkClassName={wordmarkClassName}
        accentClassName={accentClassName}
      />
    </div>
  );
};

export default DoctorLogoHeader;
