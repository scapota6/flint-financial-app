import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';

interface AuthUser {
  id: string;
  email: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

export function useAuth() {
  const posthog = usePostHog();
  
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Identify user in PostHog when authenticated
  useEffect(() => {
    if (user && posthog) {
      posthog.identify(String(user.id), {
        email: user.email,
      });
    } else if (!user && posthog) {
      posthog.reset();
    }
  }, [user, posthog]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
