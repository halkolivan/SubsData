import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = "http://localhost:5173/auth/callback";

app.post("/auth/google", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const tokenData = await tokenResp.json();
    if (tokenData.error) return res.status(400).json(tokenData);

    // Получаем данные пользователя
    const userResp = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const userData = await userResp.json();

    res.json({ token: tokenData.access_token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/github", async (req, res) => {
  console.log("⚡ Запрос на /auth/github, body:", req.body);
  const { code } = req.body;

  if (!code) {
    console.log("❌ Нет кода в body");
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: "http://localhost:5173/auth/callback",
    });

    const tokenResp = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: params,
      }
    );

    const tokenData = await tokenResp.json();
    if (tokenData.error) return res.status(400).json(tokenData);
    console.log("⚡ Ответ от GitHub:", tokenData);

    if (tokenData.error) {
      return res.status(400).json(tokenData);
    }

    const userResp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResp.json();

    res.json({ token: tokenData.access_token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () =>
  console.log("Auth server running on http://localhost:4000")
);
