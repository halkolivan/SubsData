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
  "https://subsdata.top",
  "https://www.subsdata.top",
  process.env.FRONT_ORIGIN,
].filter(Boolean);

// --- CORS настройка ---
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "https://subsdata.top";
app.use(
  cors({
    origin: (origin, callback) => {
      // Разрешаем запросы без 'origin' (например, с localhost или curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Добавляем дополнительный лог для отладки, если что-то пойдет не так
        console.error(
          `❌ CORS Error: Origin ${origin} is not allowed. Check allowedOrigins array.`
        );
        callback(new Error("Not allowed by CORS at origin"), false);
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
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
app.post("/api/save-subscriptions", async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const subscriptionsToSave = req.body.subscriptions;

    if (!accessToken) {
      return res.status(401).json({ error: "Missing access token" });
    }
    if (!subscriptionsToSave) {
      return res
        .status(400)
        .json({ error: "Missing subscriptions data in body" });
    }

    // 1. ПОИСК ID СУЩЕСТВУЮЩЕГО ФАЙЛА
    // Ищем файл по имени и владельцу.
    let fileId = null;
    const query = encodeURIComponent(
      `name='${SUBS_FILE_NAME}' and 'me' in owners and trashed=false`
    );

    // Добавляем параметр для обхода кеша поиска Google Drive
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&v=${Date.now()}`;

    console.log("🔍 Ищем существующий файл для сохранения...");
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const searchData = await searchRes.json();
    const file = searchData.files?.[0];

    if (file) {
      fileId = file.id;
    }

    // --- НАСТРОЙКА ЗАПРОСА К GOOGLE DRIVE ---
    let url = "";
    let method = "";
    let driveBody = JSON.stringify(subscriptionsToSave);
    let driveHeaders = {
      Authorization: `Bearer ${accessToken}`,
      // По умолчанию Content-Type для обновления контента
      "Content-Type": "application/json; charset=UTF-8",
    };
    let driveData = {};

    if (fileId) {
      // 2. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕГО ФАЙЛА (PATCH)
      console.log(`💡 Обновляем файл Drive с ID: ${fileId}`);

      // Используем Media Upload URL и uploadType=media для обновления ТОЛЬКО КОНТЕНТА
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      method = "PATCH";

      // driveBody и driveHeaders уже настроены выше
    } else {
      // 3. СОЗДАНИЕ НОВОГО ФАЙЛА (POST)
      console.log(`✨ Создаем новый файл Drive: ${SUBS_FILE_NAME}`);

      url =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      method = "POST";

      // Для создания используем Multipart Upload, так как передаем и метаданные, и контент
      const metadata = {
        name: SUBS_FILE_NAME,
        mimeType: "application/json",
      };

      const boundary = "subsdata_boundary_3756"; // Произвольный разделитель
      const metadataPart = JSON.stringify(metadata);

      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadataPart}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${driveBody}\r\n` +
        `--${boundary}--`;

      driveHeaders["Content-Type"] = `multipart/related; boundary=${boundary}`;
      driveBody = multipartBody;
    }

    // 4. ВЫПОЛНЕНИЕ ЗАПРОСА К GOOGLE DRIVE API
    const driveRes = await fetch(url, {
      method: method,
      headers: driveHeaders,
      body: driveBody,
    });

    const driveTxt = await driveRes.text();

    if (!driveRes.ok) {
      console.error("❌ Ошибка Drive API:", driveTxt.slice(0, 300));
      return res.status(500).json({
        error: "Drive API error",
        details: driveTxt.slice(0, 300),
      });
    }

    // Парсинг ответа
    try {
      driveData = JSON.parse(driveTxt);
    } catch (err) {
      // Может быть не JSON, если API вернул 204 No Content, но все равно успех
      console.warn("⚠️ Ответ Drive не JSON (возможно, успешный):", err.message);
    }

    console.log(
      "✅ Drive завершил сохранение успешно:",
      driveData.id || "без ID"
    );

    // Возвращаем ID файла для кеширования на клиенте
    res.status(200).json({
      message: "Файл сохранён в Google Drive",
      // Возвращаем ID созданного/обновленного файла
      fileId: driveData.id || fileId || null,
    });
  } catch (err) {
    console.error("🔥 Критическая ошибка save-subscriptions:", err);
    res.status(500).json({
      error: "Server crash inside save-subscriptions",
      details: err.message,
    });
  }
});

app.get("/api/load-subscriptions", async (req, res) => {
  try {
    // 1. Проверяем наличие токена (используем authMiddleware для чистоты)
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      return res.status(401).json({ error: "Missing access token" });
    }

    const cacheBuster = Date.now();

    // 2. Ищем файл в Общем Drive (где его сохраняет /api/save-subscriptions)
    // Используем 'me' in owners и правильное имя файла.
    const query = encodeURIComponent(
      `name='${SUBS_FILE_NAME}' and 'me' in owners`
    );
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&v=${cacheBuster}`;

    console.log("🔍 Ищем существующий файл в Drive...");
    const searchRes = await fetch(searchUrl, {
      // 💡 ИЗМЕНЕН URL И QUERY
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const searchData = await searchRes.json();
    const file = searchData.files?.[0]; // Берем первый найденный файл

    if (!file) {
      console.log(
        `Файл ${SUBS_FILE_NAME} не найден. Возвращаем пустой массив.`
      );
      // Файл не найден, возвращаем пустой массив
      return res.status(200).json({ subscriptions: [] });
    }

    // 3. Скачиваем контент файла по его ID
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileRes.ok) {
      console.error(
        "❌ Ошибка при скачивании файла Drive:",
        await fileRes.text()
      );
      return res.status(500).json({ error: "Drive download error" });
    }

    // 💡 Drive API возвращает raw-контент, который уже является JSON
    const fileContent = await fileRes.json();
    console.log("✅ Подписки успешно загружены из Drive.");

    res.status(200).json({ subscriptions: fileContent });
  } catch (err) {
    console.error("🔥 Критическая ошибка load-subscriptions:", err);
    res.status(500).json({ error: "Server crash inside load-subscriptions" });
  }
});

// --- Google site verification ---
app.get("/googlea37d48efab48b1a5.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "googlea37d48efab48b1a5.html"));
});

const SUBS_FILE_NAME = "subsdata-subscriptions.json";

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
