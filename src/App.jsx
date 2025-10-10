import "./i18n";
import React from "react";
import Router from "./Router";
import "@assets/styles/App.css";
import { Suspense, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId =
  "512029137409-hkpm1n3t97o4r7gqf90d28unns7i2par.apps.googleusercontent.com";

// Компонент App
function App() {
  useEffect(() => {
    // Регистрируем Service Worker только в production
    if (import.meta.env.PROD) {
      registerSW({
        onNeedRefresh() {},
        onOfflineReady() {},
      });
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Suspense fallback={<div className="flex p-6 w-full justify-center items-center text-center">Загрузка...</div>}>
          <Router />
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

// Монтируем компонент в DOM
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
