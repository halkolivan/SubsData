import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

// --- Инициализация приложения ---
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Путь к папке dist ---
const distPath = path.join(__dirname, "dist");
console.log("🗂 Serving static from:", distPath);

// --- Разрешаем JSON для body ---------//
app.use(express.json());

const allowedOrigins = [
  // 1. Локальная разработка (если порт 5173)
  "http://localhost:5173",
  // 2. Основной домен Vercel (через переменную окружения или новый Vercel-домен)
  process.env.FRONT_ORIGIN || "https://subsdata.vercel.app",
  // 3. Старый домен (если нужно для обратной совместимости)
  "https://subsdata.vercel.app",
];


// --- CORS настройка ---
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "https://subsdata.vercel.app";
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// --- Service Worker ---
app.get("/sw.js", (req, res) => {
  const swFile = path.join(distPath, "sw.js");
  res.setHeader("Content-Type", "application/javascript");
  // 👇 запрещаем кэширование
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (fs.existsSync(swFile)) {
    res.sendFile(swFile);
  } else {
    res.send(
      "// noop service worker\n" +
        "self.addEventListener('install',()=>self.skipWaiting());\n" +
        "self.addEventListener('activate',()=>self.clients.claim());\n"
    );
  }
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
app.post("/gh-login", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, error: "Missing code parameter" });
  }

  // 1. Обмен кода на access token
  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json", // Запрашиваем JSON ответ
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ GitHub Token Exchange Error:", errorText);
      return res
        .status(400)
        .json({ success: false, error: "Failed to exchange code for token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("❌ No access_token received from GitHub:", tokenData);
      return res
        .status(400)
        .json({ success: false, error: "No access token received" });
    }

    // 2. Используем access token для получения данных пользователя
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "SubsData-App", // GitHub требует User-Agent
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("❌ GitHub User Fetch Error:", errorText);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch user data" });
    }

    const githubUser = await userResponse.json();

    // 3. Получаем email пользователя (если не был получен на шаге 2)
    let userEmail = githubUser.email;
    if (!userEmail) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "SubsData-App",
        },
      });

      if (emailsResponse.ok) {
        const emailsData = await emailsResponse.json();
        // Находим основной и подтвержденный email
        const primaryEmail = emailsData.find(
          (email) => email.primary && email.verified
        );
        userEmail = primaryEmail ? primaryEmail.email : null;
      }
    }

    // 4. Локальная сессия (в реальном приложении здесь была бы работа с базой данных и генерация JWT)
    const finalUser = {
      id: `github-${githubUser.id}`, // Уникальный ID
      login: githubUser.login,
      name: githubUser.name || githubUser.login,
      email: userEmail || `no-email-${githubUser.id}@github.com`, // Используем заглушку, если email не найден
      avatarUrl: githubUser.avatar_url,
    };

    // В реальном приложении здесь генерируется безопасный JWT
    const authToken = "PLACEHOLDER_JWT_TOKEN_FOR_GITHUB_USER";

    console.log(`✅ GitHub Login Success for user: ${finalUser.login}`);

    // 5. Отправляем данные обратно на фронтенд
    res.json({
      success: true,
      user: finalUser,
      token: authToken,
      message: "GitHub authentication successful",
    });
  } catch (error) {
    console.error("❌ GitHub Login Server Error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Internal Server Error during GitHub login",
      });
  }
});

// --- Проверка Google access_token ---
async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = auth.split(" ")[1];

  try {
    const verifyRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
      {
        headers: { "User-Agent": "SubsData-Server/1.0" },
      }
    );

    // Google вернул ответ не 200
    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error("Google token verify failed:", errText);
      return res.status(401).json({ error: "invalid_token" });
    }

    const data = await verifyRes.json();
    if (!data.email) {
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

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 2525,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// --- Новый маршрут для отправки писем (ДОБАВЛЕНО) ---
app.post("/api/send-subs-email", authMiddleware, async (req, res) => {
  // Получаем данные, которые прислал фронтенд
  const { subscriptions, userEmail } = req.body;

  if (!subscriptions || !userEmail) {
    return res
      .status(400)
      .json({ error: "Отсутствуют данные подписок или email получателя." });
  }

  // Формируем тело письма
  const emailBody = subscriptions
    .map(
      (sub, i) =>
        `${i + 1}. ${sub.name} — ${sub.price} ${sub.currency || ""} (${
          sub.status
        }), категория: ${sub.category}, следующая оплата: ${sub.nextPayment}`
    )
    .join("\n");

  const mailOptions = {
    // ОТПРАВИТЕЛЬ: Имя "Web Service SubsData" и ваш подтвержденный адрес
    from: `"Web Service SubsData" <${process.env.FROM_EMAIL}>`,
    // ПОЛУЧАТЕЛЬ: Email пользователя, полученный с фронтенда
    to: userEmail,
    subject: `Список ваших подписок из SubsData`,
    text: `Здравствуйте!\n\nВаш список подписок:\n\n${emailBody}\n\nС уважением, команда SubsData.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Письмо успешно отправлено!" });
  } catch (error) {
    console.error("❌ Ошибка Nodemailer (SendGrid):", error);
    res.status(500).json({ error: "Ошибка при отправке письма через сервер." });
  }
});

// --- Лог отсутствующих ассетов (только для диагностики) ---
app.use((req, res, next) => {
  const urlPath = req.path || req.url || "";
  const staticExt = /\.(js|css|png|jpg|jpeg|svg|webmanifest|ico|json)$/i;

  // если путь похож на статик-файл, но его нет — просто логируем
  if (
    staticExt.test(urlPath) ||
    urlPath.startsWith("/assets/") ||
    urlPath.startsWith("/icons/")
  ) {
    const fileOnDisk = path.join(distPath, urlPath.replace(/^\//, ""));
    if (!fs.existsSync(fileOnDisk)) {
      console.warn(`⚠️ 404 static asset not found: ${req.method} ${req.url}`);
    }
  }
  next();
});

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});



const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
