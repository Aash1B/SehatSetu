import React from 'react';
import { User, VideoOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VideoContainerProps {
  className?: string;
  isVideoEnabled?: boolean;
}

const VideoContainer: React.FC<VideoContainerProps> = ({ className, isVideoEnabled = true }) => {
  return (
    <div className={cn("relative w-full h-full bg-deep-space rounded-2xl overflow-hidden shadow-sm border border-gray-200", className)}>
      {/* Remote Video (Patient) */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        {isVideoEnabled ? (
          <div className="text-white/40 flex flex-col items-center gap-3">
            <User className="w-20 h-20" />
            <p className="font-medium text-lg">Patient Video Stream</p>
          </div>
        ) : (
          <div className="text-white/40 flex flex-col items-center gap-3">
            <VideoOff className="w-16 h-16" />
            <p className="font-medium text-lg">Patient Camera Off</p>
          </div>
        )}
      </div>

      {/* Local Video (Doctor) */}
      <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 flex items-center justify-center">
        <span className="text-white/50 font-medium text-sm">Local Video</span>
      </div>

      {/* Name Tags */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-sm font-medium">
        Sunita Devi
      </div>
      <div className="absolute bottom-[4.5rem] right-4 bg-black/50 backdrop-blur-md px-3 py-1 text-xs rounded-lg border border-white/10 text-white font-medium z-10">
        You
      </div>
    </div>
  );
};

export default VideoContainer;
