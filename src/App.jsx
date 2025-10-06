import "./i18n";
import Router from "./Router";
import "@assets/styles/App.css";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { registerSW } from "virtual:pwa-register";

const clientId =
  "512029137409-hkpm1n3t97o4r7gqf90d28unns7i2par.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={clientId}>
    <AuthProvider>
      <Router />
    </AuthProvider>
  </GoogleOAuthProvider>
);

// Добавляем код регистрации Service Worker после рендера
registerSW({
  onNeedRefresh() {},
  onOfflineReady() {}
});
