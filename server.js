// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

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
