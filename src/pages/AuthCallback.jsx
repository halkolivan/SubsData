// src/pages/AuthCallback.jsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context-export";
import { useLocation, useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const { t } = useTranslation();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const code = new URLSearchParams(search).get("code");
    if (!code) {
      navigate("/");
      return;
    }

    // адрес твоего auth-сервера — по умолчанию используем тот же origin, если VITE_AUTH_SERVER не задан
    const AUTH_SERVER =
      import.meta.env.VITE_AUTH_SERVER || window.location.origin;

    fetch(`${AUTH_SERVER}/auth/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user && data.token) {
          // login из AuthContext (у тебя уже есть login)
          login(
            {
              id: data.user.id || data.user.login,
              name: data.user.name || data.user.login,
              email: data.user.email || data.user.html_url,
            },
            data.token
          );
          navigate("/");
        } else {
          navigate("/");
        }
      })
      .catch(() => navigate("/"));
  }, [search, login, navigate]);

  return <p>{t("SignInWithGitHub")}...</p>;
}
