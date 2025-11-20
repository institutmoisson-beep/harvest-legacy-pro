import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { LocalCache } from "./lib/localCache";

// Nettoyage du cache au démarrage de manière asynchrone
setTimeout(() => LocalCache.cleanup(), 0);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
