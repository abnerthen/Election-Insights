import { createRoot } from "react-dom/client";
import React from 'react'
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In production (e.g. GitHub Pages), route API requests to your live Render backend
if (import.meta.env.PROD) {
  // Replace this URL with your actual deployed Render API service URL
  setBaseUrl("https://dashboard-pru-api.onrender.com/");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>);
