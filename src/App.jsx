import "./i18n";
import Router from "./Router";
import "@assets/styles/App.css";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";

const clientId =
  "512029137409-hkpm1n3t97o4r7gqf90d28unns7i2par.apps.googleusercontent.com";

// Компонент App
function App() {
  React.useEffect(() => {
    // Регистрируем Service Worker только один раз при монтировании
    registerSW({
      onNeedRefresh() {},
      onOfflineReady() {},
    });
  }, []);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

// Монтируем компонент в DOM
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
