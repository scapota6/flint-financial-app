import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { useActivity } from '@/contexts/ActivityContext';
import { apiRequest } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

const isNative = Capacitor.isNativePlatform();

export function ActivityTimeoutModal() {
  const { showWarningModal, countdownSeconds, resetActivity, closeWarningModal } = useActivity();
  const [, setLocation] = useLocation();

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/auth/refresh', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to refresh session');
      }
      return res.json();
    },
    onSuccess: () => {
      resetActivity();
    },
    onError: (error) => {
      console.error('Session refresh failed:', error);
      handleLogout();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to logout');
      }
      return res.json();
    },
    onSuccess: () => {
      setLocation('/');
    },
    onError: () => {
      window.location.href = '/';
    },
  });

  const handleStayLoggedIn = () => {
    refreshMutation.mutate();
  };

  const handleLogout = () => {
    closeWarningModal();
    logoutMutation.mutate();
  };

  // Auto-logout when countdown reaches 0
  useEffect(() => {
    if (showWarningModal && countdownSeconds === 0) {
      handleLogout();
    }
  }, [showWarningModal, countdownSeconds]);

  // Skip showing modal on native platforms - use biometric lock instead
  if (isNative) {
    return null;
  }

  return (
    <AlertDialog open={showWarningModal}>
      <AlertDialogContent data-testid="modal-activity-timeout">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Session About to Expire
          </AlertDialogTitle>
          <AlertDialogDescription>
            You've been inactive for a while. Your session will expire in{' '}
            <span className="font-semibold text-foreground" data-testid="text-countdown">
              {countdownSeconds}
            </span>{' '}
            seconds due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleStayLoggedIn}
            disabled={refreshMutation.isPending}
            data-testid="button-stay-logged-in"
          >
            {refreshMutation.isPending ? 'Refreshing...' : 'Stay Logged In'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
