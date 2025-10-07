import "./i18n";
import React from "react";
import Router from "./Router";
import "@assets/styles/App.css";
import { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

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
        <Suspense fallback={<div className="p-6 text-center">Загрузка...</div>}>
          <Router />
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

// Монтируем компонент в DOM
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
