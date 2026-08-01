import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MonitorUp, MoreVertical, User, MessageSquare } from 'lucide-react';
import ConsultationTimer from '../../doctor/components/ConsultationTimer';
import { cn } from '../../lib/utils';

const VideoConsultationPage: React.FC = () => {
  const { id = '1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleEndCall = () => {
    navigate('/patient/dashboard');
  };

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deep-space">
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Area */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/patient/dashboard')}
              className="text-gray-500 hover:text-deep-space font-medium text-sm transition-colors"
            >
              ← Back to Dashboard
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
              <Shield className="w-4 h-4" />
              End-to-End Encrypted
            </div>
          </div>
          <ConsultationTimer />
        </div>

        {/* Main Consultation Area */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left Column: Video & Controls */}
            <div className="lg:col-span-8 flex flex-col h-full gap-4">
              <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-deep-space shadow-sm border border-gray-200">
                {/* Remote Video (Doctor) */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-white/40 flex flex-col items-center gap-3">
                    <User className="w-20 h-20" />
                    <p className="font-medium text-lg">Dr. Ananya Sharma (Connecting...)</p>
                  </div>
                </div>

                {/* Local Video (Patient) */}
                <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 flex items-center justify-center">
                  {!isVideoOff ? (
                    <span className="text-white/50 font-medium text-sm">Local Video</span>
                  ) : (
                    <VideoOff className="w-8 h-8 text-white/50" />
                  )}
                </div>

                {/* Name Tags */}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-sm font-medium">
                  Dr. Ananya Sharma
                </div>
                <div className="absolute bottom-[4.5rem] right-4 bg-black/50 backdrop-blur-md px-3 py-1 text-xs rounded-lg border border-white/10 text-white font-medium z-10">
                  You
                </div>
              </div>

              {/* Video Controls */}
              <div className="shrink-0 flex items-center justify-center gap-4 py-4 px-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isMuted ? "bg-red-100 text-red-600" : "bg-gray-100 text-deep-space hover:bg-gray-200"
                  )}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button 
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isVideoOff ? "bg-red-100 text-red-600" : "bg-gray-100 text-deep-space hover:bg-gray-200"
                  )}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                </button>

                <button className="w-12 h-12 rounded-full bg-gray-100 text-deep-space hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <MonitorUp className="w-5 h-5" />
                </button>

                <button className="w-12 h-12 rounded-full bg-gray-100 text-deep-space hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>

                <div className="w-px h-8 bg-gray-200 mx-2"></div>

                <button 
                  onClick={handleEndCall}
                  className="px-6 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center transition-colors gap-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </button>
              </div>
            </div>

            {/* Right Column: Doctor Details & Chat */}
            <div className="lg:col-span-4 flex flex-col h-full gap-4 overflow-y-auto pr-2 pb-2 custom-scrollbar">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                    AS
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Dr. Ananya Sharma</h3>
                    <p className="text-gray-500 text-sm">Dermatologist</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-gray-500 text-sm">Experience</span>
                    <span className="font-medium text-gray-900">11+ Years</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-gray-500 text-sm">Language</span>
                    <span className="font-medium text-gray-900">English, Hindi</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Consultation Chat
                </h4>
                <div className="flex-1 border border-gray-100 rounded-xl bg-gray-50 mb-4 p-4 flex flex-col justify-end">
                  <p className="text-center text-gray-400 text-sm">Your messages will appear here.</p>
                </div>
                <div className="relative">
                  <input type="text" placeholder="Type a message..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 font-medium text-sm px-3 py-1 bg-blue-50 rounded-lg">Send</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoConsultationPage;
