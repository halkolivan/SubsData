import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import nodemailer from "nodemailer";

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = path.join(__dirname, "dist");

// --- Инициализация приложения ---
const app = express();

// --- Разрешаем JSON для body ---
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONT_ORIGIN || "https://subsdata.top",
];

// --- CORS настройка ---
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "https://subsdata.top";
"http://localhost:5173", // Локальная разработка
  app.use(
    cors({
      origin: (origin, callback) => {
        // Разрешаем запросы без 'origin' (например, с localhost)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true, // чтобы работали куки / авторизация
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

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
  port: process.env.MAIL_PORT,
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

// --- Новый маршрут для сохранения подписок в Google Drive ---
// --- save-subscriptions: максимально безопасная версия для отладки ---
app.post("/api/save-subscriptions", authMiddleware, async (req, res) => {
  const accessToken = req.token;
  const { subscriptions } = req.body;

  if (!subscriptions) {
    return res.status(400).json({ error: "Нет данных подписок" });
  }

  const fileName = "subsdata-subscriptions.json";
  const fileContent = JSON.stringify(subscriptions, null, 2);

  try {
    // --- корректный поиск файла ---
    const query = encodeURIComponent(`name='${fileName}' and 'me' in owners`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const searchTxt = await searchRes.text();
    console.log("🔍 Drive search response:", searchTxt);

    let searchData = {};
    try {
      searchData = JSON.parse(searchTxt);
    } catch {
      console.error("⚠️ Drive ответ не JSON:", searchTxt);
      return res.status(500).json({ error: "Некорректный ответ от Drive API" });
    }

    const existingFile =
      Array.isArray(searchData.files) && searchData.files.length
        ? searchData.files[0]
        : null;

    // --- формируем multipart тело ---
    const metadata = { name: fileName, mimeType: "application/json" };
    const boundary = "subsdata_boundary_" + Date.now();

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      fileContent +
      `\r\n--${boundary}--`;

    const uploadUrl = existingFile
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const method = existingFile ? "PATCH" : "POST";

    // ---------- загрузка ----------
    const driveRes = await fetch(uploadUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    // ❗ ЧИТАЕМ тело ОДИН РАЗ
    const driveTxt = await driveRes.text();
    console.log("📤 Drive upload response:", driveRes.status, driveTxt);

    if (!driveRes.ok) {
      return res
        .status(500)
        .json({ error: "Drive API error", details: driveTxt.slice(0, 500) });
    }

    let driveData = {};
    try {
      driveData = JSON.parse(driveTxt);
    } catch {
      console.warn("⚠️ Drive ответ не JSON:", driveTxt);
    }

    return res.status(200).json({
      message: "Файл сохранён в Google Drive",
      fileId: driveData.id || null,
    });
  } catch (err) {
    console.error("❌ Внутренняя ошибка save-subscriptions:", err);
    res.status(500).json({
      error: "Server crash inside save-subscriptions",
      details: err.message,
    });
  }
  console.log("✅ /api/save-subscriptions завершился без ошибок");
});

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

export default app;
