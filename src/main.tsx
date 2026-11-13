import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Cloudflare Web Analytics: the beacon is only injected when a site token is
// configured, so nothing is loaded on a machine that has no token.
const analyticsToken = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
if (analyticsToken) {
  const beacon = document.createElement("script");
  beacon.defer = true;
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.dataset.cfBeacon = JSON.stringify({ token: analyticsToken });
  document.head.appendChild(beacon);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Error reporting is loaded after the first paint so it never delays the app.
window.setTimeout(() => {
  void import("./lib/sentry").then((module) => module.initSentry());
}, 1200);
