// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

// --- Google OAuth (оставил как у вас) ---
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
} = process.env;

function createOAuthClient() {
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob"
  );
  if (GOOGLE_REFRESH_TOKEN) {
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  }
  return oAuth2Client;
}

app.get("/auth-url", (req, res) => {
  const oAuth2Client = createOAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });
  res.json({ authUrl });
});

app.post("/exchange-code", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code required" });
  try {
    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    res.json({ tokens });
  } catch (err) {
    console.error("Error exchanging code:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

async function uploadJsonToDrive(auth, filename, jsonString) {
  const drive = google.drive({ version: "v3", auth });
  const q = `name='${filename.replace(/'/g, "\\'")}' and trashed=false`;
  const listRes = await drive.files.list({ q, fields: "files(id,name)" });
  const bufferStream = Readable.from([jsonString]);

  if (listRes.data.files?.length > 0) {
    const fileId = listRes.data.files[0].id;
    const updateRes = await drive.files.update({
      fileId,
      media: { mimeType: "application/json", body: bufferStream },
    });
    return { updated: true, id: fileId, res: updateRes.data };
  } else {
    const createRes = await drive.files.create({
      requestBody: { name: filename, mimeType: "application/json" },
      media: { mimeType: "application/json", body: bufferStream },
      fields: "id,name",
    });
    return { created: true, id: createRes.data.id, res: createRes.data };
  }
}

app.post("/save-subs", async (req, res) => {
  const { subscriptions } = req.body;
  if (!subscriptions)
    return res.status(400).json({ error: "subscriptions required in body" });

  console.log(
    "Received subscriptions count:",
    subscriptions.length || "unknown"
  );

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      success: false,
      error: "Google credentials not set in .env",
    });
  }

  if (!GOOGLE_REFRESH_TOKEN) {
    const oAuth2Client = createOAuthClient();
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent",
    });
    return res.status(400).json({
      success: false,
      error: "No GOOGLE_REFRESH_TOKEN. Obtain one via auth URL.",
      authUrl,
    });
  }

  try {
    const oAuth2Client = createOAuthClient();
    await oAuth2Client.getAccessToken();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `subsdata-backup-${timestamp}.json`;
    const jsonString = JSON.stringify(
      { savedAt: new Date().toISOString(), subscriptions },
      null,
      2
    );

    const result = await uploadJsonToDrive(oAuth2Client, filename, jsonString);
    res.json({ success: true, drive: result });
  } catch (err) {
    console.error("Error saving to Drive:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// --- Раздача фронтенда ---
// Попытаемся найти папку сборки (dist или build)
const candidateDirs = ["dist", "build", "public"];
let distPath = candidateDirs
  .map((d) => path.join(__dirname, d))
  .find((p) => fs.existsSync(p));

if (!distPath) {
  // fallback — ожидаем dist (vite) по умолчанию
  distPath = path.join(__dirname, "dist");
}
console.log("🗂️ Serving static files from:", distPath);

// express.static с fallthrough=true (по умолчанию) — но мы обрабатываем "файловые" запросы отдельно
app.use(express.static(distPath, { extensions: ["html"] }));

// Если пришёл запрос к файлу (имеется расширение) и express.static не нашёл — вернуть 404
app.get(/.*/, (req, res, next) => {
  const requestedPath = req.path;

  if (
    requestedPath.startsWith("/api/") ||
    requestedPath.startsWith("/auth-url") ||
    requestedPath.startsWith("/exchange-code") ||
    requestedPath.startsWith("/save-subs")
  ) {
    return next();
  }

  // Если есть расширение — вернуть 404, чтобы избежать text/html для js/css
  if (path.extname(requestedPath)) {
    console.warn("🔍 Static file not found, returning 404 for:", requestedPath);
    return res.status(404).send("Not found");
  }

  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) {
    console.log("📄 Serving index.html for:", requestedPath);
    return res.sendFile(indexFile);
  } else {
    console.error("❌ index.html not found in", distPath);
    return res.status(500).send("index.html not found on server");
  }
});



// --- Старт ---
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
