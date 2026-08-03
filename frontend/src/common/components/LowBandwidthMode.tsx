import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Video, WifiOff } from 'lucide-react';

const LowBandwidthMode = () => {
  const room = useRoomContext();
  const [audioOnly, setAudioOnly] = useState(false);

  const setRemoteVideoSubscribed = (subscribed: boolean) => {
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.source === Track.Source.Camera || publication.source === Track.Source.ScreenShare) {
          publication.setSubscribed(subscribed);
        }
      });
    });
  };

  const toggleAudioOnly = async () => {
    const nextAudioOnly = !audioOnly;
    try {
      if (nextAudioOnly) {
        await room.localParticipant.setCameraEnabled(false);
        setRemoteVideoSubscribed(false);
      } else {
        setRemoteVideoSubscribed(true);
        await room.localParticipant.setCameraEnabled(true);
      }
      setAudioOnly(nextAudioOnly);
    } catch (error) {
      console.error('Unable to change low-bandwidth mode:', error);
    }
  };

  useEffect(() => {
    if (!audioOnly) return;
    const keepVideoDisabled = () => setRemoteVideoSubscribed(false);
    room.on('trackPublished', keepVideoDisabled);
    return () => {
      room.off('trackPublished', keepVideoDisabled);
      setRemoteVideoSubscribed(true);
    };
  }, [audioOnly, room]);

  return (
    <div className="absolute right-4 top-4 z-30 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggleAudioOnly}
        aria-pressed={audioOnly}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-lg backdrop-blur transition-all ${
          audioOnly
            ? 'border-amber-300 bg-amber-400 text-slate-950 hover:bg-amber-300'
            : 'border-white/20 bg-slate-950/80 text-white hover:bg-slate-900'
        }`}
        title="Use less data while keeping audio connected"
      >
        {audioOnly ? <Video className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {audioOnly ? 'Restore video' : 'Low bandwidth'}
      </button>
      {audioOnly && (
        <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium text-white shadow">
          Audio-only mode · call stays connected
        </span>
      )}
    </div>
  );
};

export default LowBandwidthMode;
