import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-sm font-medium transition-all duration-300 shadow-md ${
        !isOnline
          ? 'bg-amber-600 text-white'
          : 'bg-emerald-600 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              You are currently offline. Live doctor search, booking, and prescriptions require network access.
            </span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 shrink-0" />
            <span>Internet connection restored.</span>
          </>
        )}
      </div>
    </div>
  );
}
