import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import { PostHogProvider } from 'posthog-js/react';
import { MetaMaskProvider } from "@metamask/sdk-react";
import { HelmetProvider } from 'react-helmet-async';
import "./index.css";
import "./styles/flint-glass.css";
import "./styles/apple-theme.css";

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: false, // Disable to prevent conflicts with MetaMask SDK cyclic structures
  disable_session_recording: true, // Disable session recording to prevent cyclic structure errors
  disable_scroll_properties: true, // Disable scroll tracking
  __add_tracing_headers: ['flint-investing.com', 'flint-investing.replit.app'], // Enable session ID tracing for server-side correlation
  sanitize_properties: (properties: Record<string, unknown>) => {
    // Remove any properties that might contain cyclic structures
    const sanitized: Record<string, unknown> = {};
    for (const key in properties) {
      try {
        JSON.stringify(properties[key]);
        sanitized[key] = properties[key];
      } catch {
        // Skip properties that can't be serialized
        sanitized[key] = '[Circular]';
      }
    }
    return sanitized;
  },
};

// Render app with error boundary wrapping MetaMask to prevent cyclic serialization crashes
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <MetaMaskProvider
        sdkOptions={{
          dappMetadata: {
            name: "Flint",
            url: window.location.href,
          },
          infuraAPIKey: import.meta.env.VITE_INFURA_API_KEY,
          enableAnalytics: false,
        }}
      >
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
      </MetaMaskProvider>
    </ErrorBoundary>
  </StrictMode>
);
