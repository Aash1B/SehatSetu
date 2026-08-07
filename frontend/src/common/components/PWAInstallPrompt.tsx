import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sehatsetu_pwa_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getInitialInstallState() {
  if (typeof window === 'undefined') {
    return { isStandalone: false, isDismissed: false, isIOS: false };
  }
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  const isDismissed =
    !!dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION_MS;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);

  return { isStandalone, isDismissed, isIOS };
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState] = useState(getInitialInstallState);
  const [isVisible, setIsVisible] = useState(
    () => !installState.isStandalone && !installState.isDismissed && installState.isIOS
  );

  useEffect(() => {
    if (installState.isStandalone || installState.isDismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [installState.isStandalone, installState.isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div
      role="banner"
      aria-label="Install SehatSetu App"
      className="fixed bottom-5 left-5 z-[9990] max-w-sm w-full p-4 bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-800 rounded-xl shadow-2xl transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl text-white shrink-0 shadow-sm">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Install SehatSetu App
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Install our healthcare portal for quick access from your home screen.
          </p>

          {installState.isIOS ? (
            <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Share className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong></span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Not Now
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Close install prompt"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
