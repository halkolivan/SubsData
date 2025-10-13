import "./i18n";
import React, { Suspense, useEffect } from "react";
import Router from "./Router";
import "@assets/styles/App.css";
import { registerSW } from "virtual:pwa-register";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "408629276793-90jf6aqt0lupftengqnodqd0dgnl2lck.apps.googleusercontent.com";

function App() {
  useEffect(() => {
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
        <Suspense
          fallback={
            <div className="flex p-6 w-full justify-center items-center text-center">
              Загрузка...
            </div>
          }
        >
          <Router />
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
