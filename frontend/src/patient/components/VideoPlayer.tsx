import React from 'react';

interface VideoPlayerProps {
  // TODO: Add video props (session token, channel name, etc.)
}

const VideoPlayer: React.FC<VideoPlayerProps> = () => {
  return (
    <div className="video-player">
      {/* Agora/LiveKit video call component with audio-only fallback */}
    </div>
  );
};

export default VideoPlayer;
