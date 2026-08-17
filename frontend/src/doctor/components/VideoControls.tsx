import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VideoControlsProps {
  className?: string;
  onEndCall: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({ className, onEndCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string>('');

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-3 px-3 sm:px-6 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-full", className)}>
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0",
          isMuted ? "bg-red-100 text-red-600" : "bg-gray-100 text-deep-space hover:bg-gray-200"
        )}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      <button 
        onClick={() => setIsVideoOff(!isVideoOff)}
        className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0",
          isVideoOff ? "bg-red-100 text-red-600" : "bg-gray-100 text-deep-space hover:bg-gray-200"
        )}
        title={isVideoOff ? "Turn on Camera" : "Turn off Camera"}
      >
        {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      <button 
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-deep-space hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
        title="Share Screen"
      >
        <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <button 
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-deep-space hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
        title="More Options"
      >
        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1"></div>

      <div className="relative flex items-center">
        <input 
          ref={dateInputRef}
          type="date" 
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          className="absolute bottom-full mb-2 right-0 opacity-0 pointer-events-none"
        />
        <button 
          onClick={() => {
            try {
              dateInputRef.current?.showPicker();
            } catch (e) {
              dateInputRef.current?.focus();
            }
          }}
          className="px-3 sm:px-4 h-10 sm:h-12 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold flex items-center justify-center transition-colors gap-1.5 sm:gap-2 border border-blue-200 text-xs sm:text-sm"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="truncate">{followUpDate ? new Date(followUpDate).toLocaleDateString() : 'Follow-up'}</span>
        </button>
      </div>

      <button 
        onClick={onEndCall}
        className="px-4 sm:px-6 h-10 sm:h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center transition-colors gap-1.5 sm:gap-2 text-xs sm:text-sm shrink-0"
      >
        <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>End Call</span>
      </button>
    </div>
  );
};

export default VideoControls;
