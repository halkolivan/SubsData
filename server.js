// import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import fetch from "node-fetch";
// import FormData from "form-data";
import { fileURLToPath } from "url";
// import nodemailer from "nodemailer";

// --- Инициализация приложения ---
const app = express();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// --- Путь к папке dist ---
const distPath = path.resolve(process.cwd(), "dist");
console.log("🗂 Serving static from:", distPath);

// --- Разрешаем JSON для body ---
app.use(express.json());
app.use((req, res, next) => {
  const oldHost = "subsdata.vercel.app";
  const newDomain = "https://subsdata.vercel.app";

  if (req.headers.host?.startsWith(oldHost)) {
    // Получаем полный путь, включая параметры запроса
    const fullUrl = newDomain + req.originalUrl;

    // Выполняем 301 редирект (Moved Permanently)
    console.log(`➡️ 301 Redirecting ${req.originalUrl} to ${fullUrl}`);
    return res.redirect(301, fullUrl);
  }

  // Если хост не старый домен, продолжаем обработку как обычно
  next();
});

const VITE_CLIENT_URL = process.env.VITE_CLIENT_URL || "http://localhost:5173";
const FRONT_ORIGIN = VITE_CLIENT_URL;

const allowedOrigins = [
  "http://localhost:5173",
  FRONT_ORIGIN || "https://subsdata.vercel.app",
  "https://subsdata.vercel.app",
  "https://www.subsdata.vercel.app",
];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        }
      },
      credentials: true, // чтобы работали куки / авторизация
      methods: ["GET, HEAD, PUT, PATCH, POST, DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
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
  // const fileOnDisk = path.join(distPath, rel);
  // if (fs.existsSync(fileOnDisk)) return res.sendFile(fileOnDisk);
  return res.status(404).send("Not found");
});

// --- Локализации ---
app.get(/^\/locales\/.*/, (req, res) => {
  const rel = req.path.replace(/^\//, "");
  // const fileOnDisk = path.join(distPath, rel);
  // if (fs.existsSync(fileOnDisk)) return res.sendFile(fileOnDisk);
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
    // const fileOnDisk = path.join(distPath, urlPath.replace(/^\//, ""));
    // if (!fs.existsSync(fileOnDisk)) {
    //   console.warn(`⚠️ 404 static asset not found: ${req.method} ${req.url}`);
    // }
  }
  next();
});

// --- GitHub авторизация ---
app.post("/auth/github", async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing_code" });

  // 2. ⚠️ ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ: убедитесь, что они доступны на Vercel!
  const GITHUB_CLIENT_ID = process.env.VITE_GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!GITHUB_CLIENT_SECRET) {
    console.error("❌ CRITICAL: GITHUB_CLIENT_SECRET is not set.");
    return res
      .status(500)
      .json({ error: "Server configuration error: GitHub Secret missing." });
  }

  // 3. Запрос на получение токена
  const tokenResponse = await fetch(
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
        code: code,
        redirect_uri: redirect_uri, // ❌ Если его нет, GitHub вернет ошибку, которую мы обработаем ниже.
      }),
    }
  );

  const tokenData = await tokenResponse.json();

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
          redirect_uri: redirect_uri,
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



// --- Раздача статики ---
app.use(
  express.static(distPath, {
    index: false,
    // setHeaders: (res, path) => {
    //   console.log("Serving:", path);
    //   if (
    //     path.endsWith(".html") ||
    //     path.endsWith(".js") ||
    //     path.endsWith(".css")
    //   ) {
    //     res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    //     res.setHeader("Pragma", "no-cache");
    //     res.setHeader("Expires", "0");
    //   } else {
    //     // изображения и иконки можно кэшировать
    //     res.setHeader("Cache-Control", "public, max-age=604800"); // 7 дней
    //   }
    // },
  })
);
// --- Google site verification ---
app.get("/googlea37d48efab48b1a5.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "googlea37d48efab48b1a5.html"));
});

app.get(/.*/, (req, res) => {
  // Игнорируем только API
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const indexFile = path.join(distPath, "index.html");
  res.sendFile(indexFile);
});

// --- Запуск ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
