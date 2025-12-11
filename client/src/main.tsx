import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import { PostHogProvider } from 'posthog-js/react';
import { MetaMaskProvider } from "@metamask/sdk-react";
import "./index.css";
import "./styles/flint-glass.css";
import "./styles/apple-theme.css";

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: false, // Disable to prevent conflicts with MetaMask SDK cyclic structures
};

// Render app with error boundary, PostHog provider, and MetaMask provider
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider 
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_ucEZRx85Wj0m5hW2b8BEpf0C9GfwoFzWCXs1R2tUyyJ'} 
      options={posthogOptions}
    >
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
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MetaMaskProvider>
    </PostHogProvider>
  </StrictMode>
);
