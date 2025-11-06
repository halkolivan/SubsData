import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "https://subsdata.vercel.app/api/auth-google-callback",
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    return res.status(200).json(tokens);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return res.status(500).json({ error: "OAuth failed" });
  }
}