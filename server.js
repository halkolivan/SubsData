import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

// ==== Google Drive upload (без изменений) ====
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

// ==== API ====
app.post("/save-subs", async (req, res) => {
  const { subscriptions } = req.body;
  if (!subscriptions)
    return res.status(400).json({ error: "subscriptions required" });

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
    console.error("Drive upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==== FRONTEND (Vite) ====
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath, { maxAge: "1y", index: false }));

// Отдаём index.html только если реального файла нет
app.get("*", (req, res, next) => {
  const requestedPath = path.join(distPath, req.path);
  if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isFile()) {
    console.log("Serving file:", requestedPath);
    return res.sendFile(requestedPath);
  }
  console.log("Fallback to index.html for:", req.path);
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}, distPath: ${distPath}`)
);
