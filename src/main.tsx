import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { LocalCache } from "./lib/localCache";

// Nettoyage du cache au démarrage de manière asynchrone
setTimeout(() => LocalCache.cleanup(), 0);

if ('serviceWorker' in navigator) {
  const isLovablePreview = window.self !== window.top || /^id-preview--|^preview--/.test(window.location.hostname);
  if (isLovablePreview || import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const scriptURL = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
        if (scriptURL.includes('/dev-sw.js') || scriptURL.includes('/sw.js')) registration.unregister();
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
