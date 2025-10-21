import "./i18n";
import Router from "./Router";
import "@assets/styles/App.css";
import { registerSW } from "virtual:pwa-register";
import React, { Suspense, useEffect } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Loader from "@assets/loaders/loader.svg";

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
            <div className="flex h-screen justify-center items-center">
              <img
                src={Loader}
                alt="Loading..."
                className="w-16 h-16 animate-pulse"
              />
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
