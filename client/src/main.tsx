import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import { PostHogProvider } from 'posthog-js/react';
import "./index.css";
import "./styles/flint-glass.css";

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: true,
};

// Render app with error boundary and PostHog provider
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider 
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_ucEZRx85Wj0m5hW2b8BEpf0C9GfwoFzWCXs1R2tUyyJ'} 
      options={posthogOptions}
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </PostHogProvider>
  </StrictMode>
);
