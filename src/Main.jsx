import React from "react";
import App from "@/App.jsx";
import "@assets/styles/index.css";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
