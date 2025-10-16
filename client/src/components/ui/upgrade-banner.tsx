import { useState, useEffect, useRef } from 'react';
import { X, Crown } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';

const BANNER_DISMISS_KEY = 'flint_upgrade_banner_dismissed';

interface User {
  id: string;
  email: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

export function UpgradeBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const dismissTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  useEffect(() => {
    const dismissed = sessionStorage.getItem(BANNER_DISMISS_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (user && user.subscriptionTier === 'free' && !isDismissed) {
      timer = setTimeout(() => setIsVisible(true), 100);
      document.documentElement.classList.add('has-upgrade-banner');
    } else {
      document.documentElement.classList.remove('has-upgrade-banner');
    }
    
    return () => {
      if (timer) clearTimeout(timer);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      document.documentElement.classList.remove('has-upgrade-banner');
    };
  }, [user, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissTimeoutRef.current = setTimeout(() => {
      document.documentElement.classList.remove('has-upgrade-banner');
      setIsDismissed(true);
      sessionStorage.setItem(BANNER_DISMISS_KEY, 'true');
    }, 300);
  };

  if (!user || user.subscriptionTier !== 'free' || isDismissed) {
    return null;
  }

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-[90] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 flex-shrink-0" />
            <p className="text-white text-sm sm:text-base font-medium truncate">
              <span className="hidden sm:inline">Upgrade to unlock more connections and premium features! </span>
              <span className="sm:hidden">Get more connections & features! </span>
              <Link href="/subscribe">
                <span
                  className="underline hover:text-yellow-300 transition-colors cursor-pointer font-semibold"
                  data-testid="link-upgrade-subscribe"
                >
                  Subscribe now
                </span>
              </Link>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 p-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Dismiss upgrade banner"
            data-testid="button-dismiss-banner"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
