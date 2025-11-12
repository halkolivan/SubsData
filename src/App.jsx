import "./i18n";
import i18n from "./i18n";
import Router from "./Router";
import "@assets/styles/App.css";
import "@assets/styles/fonts.css";
import { I18nextProvider } from "react-i18next";
import { registerSW } from "virtual:pwa-register";
import React, { Suspense, useEffect } from "react";
import { AuthProvider } from "@/context/AuthContext";
import Loader from "@assets/loaders/LoadingGray.svg";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
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
        <I18nextProvider i18n={i18n}>
          <Suspense
            fallback={
              <div className="flex h-screen justify-center items-center">
                <img
                  src={Loader}
                  alt="Loading..."
                  className="w-32 h-32 animate-pulse"
                />
              </div>
            }
          >
            <Router />
          </Suspense>
        </I18nextProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
export default App;
