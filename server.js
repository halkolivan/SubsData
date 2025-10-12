
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";

// Чтобы работал __dirname в ES-модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

// Read Google credentials from env
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN
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
  // Return a one-time auth URL so the developer can obtain a code and exchange it for a refresh token.
  const oAuth2Client = createOAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent"
  });
  res.json({ authUrl });
});

app.post("/exchange-code", async (req, res) => {
  // Exchange an OAuth2 code for tokens (one-time). Save refresh_token to use later.
  // Body: { code: "CODE_FROM_GOOGLE" }
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code required" });
  try {
    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    // tokens.refresh_token is what you want to persist in your .env (or secret store)
    res.json({ tokens });
  } catch (err) {
    console.error("Error exchanging code:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

async function uploadJsonToDrive(auth, filename, jsonString) {
  const drive = google.drive({ version: "v3", auth });

  // Try to find existing file with same name (not trashed)
  const q = `name='${filename.replace(/'/g, "\\'")}' and trashed=false`;
  const listRes = await drive.files.list({ q, fields: "files(id,name)" });

  const bufferStream = Readable.from([jsonString]);

  if (listRes.data.files && listRes.data.files.length > 0) {
    const fileId = listRes.data.files[0].id;
    // update
    const updateRes = await drive.files.update({
      fileId,
      media: {
        mimeType: "application/json",
        body: bufferStream
      }
    });
    return { updated: true, id: fileId, res: updateRes.data };
  } else {
    // create
    const createRes = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType: "application/json"
      },
      media: {
        mimeType: "application/json",
        body: bufferStream
      },
      fields: "id,name"
    });
    return { created: true, id: createRes.data.id, res: createRes.data };
  }
}

app.post("/save-subs", async (req, res) => {
  const { subscriptions } = req.body;
  if (!subscriptions) return res.status(400).json({ error: "subscriptions required in body" });

  console.log("Received subscriptions (count):", Array.isArray(subscriptions) ? subscriptions.length : "unknown");

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      success: false,
      error:
        "Google credentials not set. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.",
    });
  }

  if (!GOOGLE_REFRESH_TOKEN) {
    // If no refresh token set yet, instruct the developer how to obtain one
    const oAuth2Client = createOAuthClient();
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent"
    });
    return res.status(400).json({
      success: false,
      error:
        "No GOOGLE_REFRESH_TOKEN found. Obtain one by visiting the auth URL and exchanging the code.",
      authUrl,
    });
  }

  try {
    const oAuth2Client = createOAuthClient();
    // ensure we have fresh access token via refresh_token
    await oAuth2Client.getAccessToken();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `subsdata-backup-${timestamp}.json`;
    const jsonString = JSON.stringify({ savedAt: new Date().toISOString(), subscriptions }, null, 2);

    const result = await uploadJsonToDrive(oAuth2Client, filename, jsonString);

    res.json({ success: true, drive: result });
  } catch (err) {
    console.error("Error saving to Drive:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Отдаём сборку Vite
app.use(express.static(path.join(process.cwd(), "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
