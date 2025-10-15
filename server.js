import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";

// --- Инициализация приложения ---
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Путь к папке dist ---
const distPath = path.join(__dirname, "dist");
console.log("🗂 Serving static from:", distPath);

// --- Разрешаем JSON для body ---
app.use(express.json());

// --- CORS настройка ---
const FRONT_ORIGIN =
  process.env.FRONT_ORIGIN || "https://subsdata.onrender.com";
app.use(
  cors({
    origin: FRONT_ORIGIN,
    credentials: true, // чтобы работали куки / авторизация
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --- Пример (если когда-то понадобится ставить куку) ---
// res.cookie("sid", sessionId, {
//   httpOnly: true,
//   secure: true,
//   sameSite: "None",
// });

// --- Service Worker ---
app.get("/sw.js", (req, res) => {
  const swFile = path.join(distPath, "sw.js");
  res.setHeader("Content-Type", "application/javascript");
  if (fs.existsSync(swFile)) return res.sendFile(swFile);
  res.send(
    "// noop service worker\nself.addEventListener('install',()=>self.skipWaiting());\nself.addEventListener('activate',()=>self.clients.claim());\n"
  );
});

// --- Иконки ---
app.get(/^\/icons\/.*/, (req, res) => {
  const rel = req.path.replace(/^\//, "");
  const fileOnDisk = path.join(distPath, rel);
  if (fs.existsSync(fileOnDisk)) return res.sendFile(fileOnDisk);
  return res.status(404).send("Not found");
});

// --- Локализации ---
app.get(/^\/locales\/.*/, (req, res) => {
  const rel = req.path.replace(/^\//, "");
  const fileOnDisk = path.join(distPath, rel);
  if (fs.existsSync(fileOnDisk)) return res.sendFile(fileOnDisk);
  return res.status(404).send("Not found");
});

// --- Диагностика ---
app.get("/__assets", (req, res) => {
  try {
    const listDir = (p) => {
      const full = path.join(distPath, p);
      if (!fs.existsSync(full)) return null;
      return fs.readdirSync(full);
    };
    res.json({
      assets: listDir("assets"),
      icons: listDir("icons"),
      locales: listDir("locales"),
    });
  } catch (err) {
    console.error("Error listing dist folders", err);
    res.status(500).json({ error: "failed to list" });
  }
});

// --- GitHub авторизация ---
app.post("/auth/github", async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing_code" });

  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET)
    return res.status(500).json({ error: "missing_github_client_env" });

  try {
    // Обмен кода на токен
    const tokenResp = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );
    const tokenJson = await tokenResp.json();
    if (tokenJson.error)
      return res.status(500).json({
        error: tokenJson.error_description || tokenJson.error,
      });

    const access_token = tokenJson.access_token;

    // Получение профиля пользователя
    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    const user = await userResp.json();

    res.json({ user, token: access_token });
  } catch (err) {
    console.error("GitHub exchange error", err);
    res.status(500).json({ error: "github_exchange_failed" });
  }
});

app.get("/get-subs", async (req, res) => {
  try {
    const filePath = path.join(__dirname, "subscriptions.json");
    if (!fs.existsSync(filePath)) return res.json({ subscriptions: [] });
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json({ subscriptions: data });
  } catch (err) {
    console.error("Ошибка при загрузке подписок:", err);
    res.status(500).json({ error: "failed_to_load" });
  }
});

// --- Проверка Google токена ---
const googleClient = new OAuth2Client();
async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "missing_token" });

  const token = auth.split(" ")[1];

  try {
    // Проверяем токен напрямую через Google API (без google-auth-library)
    const verifyRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
    );
    const data = await verifyRes.json();

    if (data.error_description || !data.email) {
      console.error("Google token verify failed:", data);
      return res.status(401).json({ error: "invalid_token" });
    }

    req.user = { id: data.sub, email: data.email };
    req.token = token;
    next();
  } catch (err) {
    console.error("Google token verify error:", err);
    res.status(401).json({ error: "invalid_token" });
  }
}



// --- Сохранение в Google Drive ---
app.post("/save-subs", authMiddleware, async (req, res) => {
  try {
    const { subscriptions } = req.body;
    const token = req.token;

    if (!Array.isArray(subscriptions))
      return res.status(400).json({ error: "no_subs_array" });

    // 1️⃣ Ищем файл subscriptions.json
    const listRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&spaces=drive&fields=files(id,name,parents)",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.json();
    const fileExists = listData.files?.length > 0;
    const fileId = fileExists ? listData.files[0].id : null;

    // 2️⃣ Готовим метаданные
    const metadata = {
      name: "subscriptions.json",
      mimeType: "application/json",
      parents: ["root"], // гарантируем, что это My Drive
    };

    const form = new FormData();
    form.append("metadata", JSON.stringify(metadata), {
      contentType: "application/json",
    });
    form.append("file", JSON.stringify(subscriptions, null, 2), {
      contentType: "application/json",
    });

    // 3️⃣ Создаём или обновляем файл
    const uploadUrl = fileExists
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const uploadRes = await fetch(uploadUrl, {
      method: fileExists ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const uploadData = await uploadRes.json();
    console.log(
      `💾 ${fileExists ? "Обновлён" : "Создан"} subscriptions.json`,
      uploadData
    );

    res.json({
      ok: true,
      action: fileExists ? "updated" : "created",
      fileId: uploadData.id,
    });
  } catch (err) {
    console.error("Ошибка при сохранении:", err);
    res.status(500).json({ error: "drive_upload_failed" });
  }
});

// --- ВРЕМЕННО: проверить что реально отвечает Google Drive ---
app.get("/debug-drive", authMiddleware, async (req, res) => {
  const token = req.token;
  try {
    const listRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&spaces=drive&fields=files(id,name,parents)",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.text(); // читаем как текст, чтобы увидеть всё
    console.log("🔍 Ответ Google Drive /files:", listData);
    res.send(listData);
  } catch (err) {
    console.error("❌ Ошибка /debug-drive:", err);
    res.status(500).send("Ошибка при обращении к Drive");
  }
});




// --- Загрузка из Google Drive ---
app.get("/mysubscriptions", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Нет токена" });
  const token = auth.split(" ")[1];

  try {
    // 1️⃣ Ищем файл в My Drive
    const listRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&spaces=drive&fields=files(id,name,parents)",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const listData = await listRes.json();
    if (!listData.files || listData.files.length === 0) {
      console.log("⚠️ Файл subscriptions.json не найден");
      return res.json({ subscriptions: [] });
    }

    const fileId = listData.files[0].id;

    // 2️⃣ Читаем содержимое
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!fileRes.ok) {
      console.error("Ошибка чтения:", await fileRes.text());
      return res.json({ subscriptions: [] });
    }

    const content = await fileRes.text();
    const parsed = JSON.parse(content || "[]");
    console.log("📥 Прочитано из Drive:", parsed.length, "подписок");

    res.json({ subscriptions: parsed });
  } catch (err) {
    console.error("❌ Ошибка при получении подписок:", err);
    res.status(500).json({ error: "Ошибка при получении подписок" });
  }
});

// --- Раздача статики ---
app.use(express.static(distPath));

// --- SPA fallback (React) ---
app.get(/.*/, (req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return res.status(404).send("Not found");
});

// --- Лог отсутствующих ассетов ---
app.use((req, res, next) => {
  const urlPath = req.path || req.url || "";
  const staticExt = /\.(js|css|png|jpg|jpeg|svg|webmanifest|ico|json)$/i;
  if (
    staticExt.test(urlPath) ||
    urlPath.startsWith("/assets/") ||
    urlPath.startsWith("/icons/")
  ) {
    const fileOnDisk = path.join(distPath, urlPath.replace(/^\//, ""));
    if (!fs.existsSync(fileOnDisk)) {
      console.warn(`404 static asset not found: ${req.method} ${req.url}`);
      return res.status(404).send("Not found");
    }
  }
  next();
});

// --- SPA fallback (React) ---
app.get(/.*/, (req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return res.status(404).send("Not found");
});

// --- Запуск ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
