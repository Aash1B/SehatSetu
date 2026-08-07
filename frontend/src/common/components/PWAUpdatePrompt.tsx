import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      if (r) {
        // Check for updates every 60 minutes
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: unknown) {
      console.error('Service worker registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-update-title"
      className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full p-4 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 rounded-xl shadow-2xl transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400 shrink-0">
          <RefreshCw className="w-5 h-5 animate-spin-slow" />
        </div>
        <div className="flex-1">
          <h3 id="pwa-update-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            New Version Available
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            A new version of SehatSetu is ready. Update now to get the latest features and fixes.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Update Now
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleClose}
          aria-label="Dismiss update notification"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
