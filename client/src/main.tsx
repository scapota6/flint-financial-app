import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import { PostHogProvider } from 'posthog-js/react';
import { HelmetProvider } from 'react-helmet-async';
import "./index.css";
import "./styles/flint-glass.css";
import "./styles/apple-theme.css";

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: false,
  disable_session_recording: true,
  disable_scroll_properties: true,
  __add_tracing_headers: ['flint-investing.com', 'flint-investing.replit.app'],
  sanitize_properties: (properties: Record<string, unknown>) => {
    const sanitized: Record<string, unknown> = {};
    for (const key in properties) {
      try {
        JSON.stringify(properties[key]);
        sanitized[key] = properties[key];
      } catch {
        sanitized[key] = '[Circular]';
      }
    }
    return sanitized;
  },
};

// MetaMask is now loaded conditionally inside App.tsx for authenticated users only
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <PostHogProvider 
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_ucEZRx85Wj0m5hW2b8BEpf0C9GfwoFzWCXs1R2tUyyJ'} 
        options={posthogOptions}
      >
        <ErrorBoundary>
          <HelmetProvider>
            <App />
          </HelmetProvider>
        </ErrorBoundary>
      </PostHogProvider>
    </ErrorBoundary>
  </StrictMode>
);
