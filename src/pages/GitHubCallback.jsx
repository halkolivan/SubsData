import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GitHubCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      fetch(
        `${
          import.meta.env.VITE_AUTH_SERVER || window.location.origin
        }/gh-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("✅ GitHub user:", data.user);
            // Сохраняем в localStorage / context
            localStorage.setItem("githubUser", JSON.stringify(data.user));
            navigate("/mysubscriptions"); // или куда нужно
          } else {
            console.error("GitHub login failed:", data.error);
          }
        });
    }
  }, []);

  return <div>Авторизация через GitHub...</div>;
}
