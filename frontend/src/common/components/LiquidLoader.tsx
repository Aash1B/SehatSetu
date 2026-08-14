import React from 'react';

interface LiquidLoaderProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export const LiquidLoader: React.FC<LiquidLoaderProps> = ({
  text = 'Loading',
  className = '',
  fullScreen = false,
}) => {
  const content = (
    <div className={`liquid-loader ${className}`}>
      <div className="loading-text">
        Loading
        <span className="dot">.</span>
        <span className="dot">.</span>
        <span className="dot">.</span>
      </div>
      <div className="loader-track">
        <div className="liquid-fill" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#F8FAFC] fixed inset-0 z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LiquidLoader;
