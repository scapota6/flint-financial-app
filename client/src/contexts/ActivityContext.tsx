import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { setActivityResetCallback } from '@/lib/queryClient';

interface ActivityContextType {
  lastActivityTime: number;
  resetActivity: () => void;
  showWarningModal: boolean;
  countdownSeconds: number;
  closeWarningModal: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const INACTIVITY_WARNING_TIME = 19 * 60 * 1000; // 19 minutes in ms
const WARNING_COUNTDOWN_TIME = 60; // 60 seconds
const TOTAL_INACTIVITY_TIME = 20 * 60 * 1000; // 20 minutes in ms

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(WARNING_COUNTDOWN_TIME);
  
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    setLastActivityTime(Date.now());
    setShowWarningModal(false);
    setCountdownSeconds(WARNING_COUNTDOWN_TIME);
    
    // Clear existing timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, []);

  const closeWarningModal = useCallback(() => {
    setShowWarningModal(false);
    setCountdownSeconds(WARNING_COUNTDOWN_TIME);
    
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, []);

  // Register activity callback with queryClient
  useEffect(() => {
    setActivityResetCallback(resetActivity);
    
    return () => {
      setActivityResetCallback(null);
    };
  }, [resetActivity]);

  // Main inactivity timer - triggers warning at 19 minutes
  useEffect(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    warningTimerRef.current = setTimeout(() => {
      setShowWarningModal(true);
      setCountdownSeconds(WARNING_COUNTDOWN_TIME);
    }, INACTIVITY_WARNING_TIME);

    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [lastActivityTime]);

  // Countdown timer - runs when warning modal is shown
  useEffect(() => {
    if (showWarningModal) {
      countdownTimerRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            // Countdown reached 0 - handled by the modal component
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [showWarningModal]);

  return (
    <ActivityContext.Provider
      value={{
        lastActivityTime,
        resetActivity,
        showWarningModal,
        countdownSeconds,
        closeWarningModal,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
