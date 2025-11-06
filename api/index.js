import "dotenv/config";
import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

// --- Инициализация приложения ---
const app = express();

// --- Разрешаем JSON для body ---
app.use(express.json());

const allowedOrigins = [
  // 1. Локальная разработка (если порт 5173)
  "http://localhost:5173",
  // 2. Основной домен Vercel (через переменную окружения или новый Vercel-домен)
  process.env.FRONT_ORIGIN || "https://subsdata.vercel.app",
  // 3. Старый домен (если нужно для обратной совместимости)
  "https://subsdata.vercel.app",
  // 4. Дополнительный API (Render)
  "https://subsdata-api.vercel.app",
];

// --- CORS настройка ---
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "https://subsdata.vercel.app";
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
