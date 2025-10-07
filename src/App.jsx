import "./i18n";
import React from "react";
import Router from "./Router";
import "@assets/styles/App.css";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { subscriptions } from "@mock/mockData.js";
import useNotifyDataSub from "@/hooks/useNotifyDataSub";
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
  // вызываем хук с мок-данными
  useNotifyDataSub(subscriptions);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Router />
    </GoogleOAuthProvider>
  );
}

// Монтируем компонент в DOM
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
