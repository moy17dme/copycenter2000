// src/main.jsx
import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const PRELOAD_RECOVERY_KEY = "cc2000.preload-recovery";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();

  if (window.sessionStorage.getItem(PRELOAD_RECOVERY_KEY)) return;
  window.sessionStorage.setItem(PRELOAD_RECOVERY_KEY, "1");

  const url = new URL(window.location.href);
  url.searchParams.set("actualizar", Date.now().toString());
  window.location.replace(url);
});

window.addEventListener("load", () => {
  window.sessionStorage.removeItem(PRELOAD_RECOVERY_KEY);
}, { once: true });

const root = document.getElementById("root");
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

function normalizePath(pathname) {
  const normalized = String(pathname || "/").replace(/\/+$/, "");
  return normalized || "/";
}

const prerenderPath = root.dataset.prerenderPath;
const canHydrate =
  root.hasChildNodes() &&
  prerenderPath &&
  normalizePath(prerenderPath) === normalizePath(window.location.pathname);

if (canHydrate) {
  hydrateRoot(root, app);
} else {
  root.replaceChildren();
  createRoot(root).render(app);
}
