import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GitHubCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("✅ GitHub OAuth code:", code);

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
          console.log("GitHub login response:", data);
          // Простейшее поведение (можно заменить на Context)
          if (data.success) {
            localStorage.setItem("githubUser", JSON.stringify(data.user));
            navigate("/mysubscriptions");
          } else {
            navigate("/");
          }
        });
    }
  }, []);

  return <div>Авторизация через GitHub...</div>;
}
