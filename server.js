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
    // 1. ИЗВЛЕЧЕНИЕ ТОКЕНА
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Токен не найден" });
    }
    const token = authHeader.split(" ")[1];

    // 2. ПОИСК ФАЙЛА (subscriptions.json)
    const searchUrl =
      'https://www.googleapis.com/drive/v3/files?q=name="subscriptions.json"&fields=files(id,name)&spaces=drive';
    const searchRes = await fetch(searchUrl, {
      method: "GET",
      headers: {
        // ✅ КРИТИЧЕСКИ ВАЖНО: Токен должен быть здесь
        Authorization: `Bearer ${token}`,
      },
    });

    // 3. ПРОВЕРКА ОТВЕТА GOOGLE
    if (searchRes.status === 401 || searchRes.status === 403) {
      console.error(
        "❌ Google Drive API вернул 401/403. Токен недействителен или нет доступа."
      );
      // Отправляем фронтенду статус, который он умеет обрабатывать (например, 403)
      return res.status(403).json({
        error:
          "Google токен недействителен или требуется повторная авторизация.",
      });
    }

    const searchData = await searchRes.json();
    const files = searchData.files;

    // 4. ПРОВЕРКА НАЛИЧИЯ ФАЙЛА (Первое использование 'files')
    if (!files || files.length === 0) {
      console.log("⚠️ Файл подписок subscriptions.json не найден.");
      // Отправляем 404, который фронтенд (AuthContext.jsx) использует, чтобы начать с пустого списка
      return res.status(404).json({ error: "Файл подписок не найден." });
    }

    // 5. ПОЛУЧЕНИЕ ID ПЕРВОГО ФАЙЛА (Второе использование 'files')
    // Мы предполагаем, что существует только один файл с таким именем.
    const fileId = files[0].id;

    // 6. ВТОРОЙ ЗАПРОС: СКАЧИВАНИЕ КОНТЕНТА
    // Используем fileId для запроса контента (alt=media)
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const downloadRes = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Используем тот же токен!
      },
    });

    // 7. ОБРАБОТКА ОТВЕТА СКАЧИВАНИЯ
    if (!downloadRes.ok) {
      console.error(
        "❌ Ошибка при скачивании контента файла:",
        downloadRes.statusText
      );
      return res
        .status(downloadRes.status)
        .json({ error: "Ошибка при скачивании файла подписок." });
    }

    // 8. ПАРСИНГ И ОТПРАВКА
    const subscriptionsText = await downloadRes.text(); // Контент — это JSON-строка
    const subscriptions = JSON.parse(subscriptionsText);

    // Отправляем данные обратно на фронтенд
    res.status(200).json({ subscriptions: subscriptions });
  } catch (err) {
    console.error("Ошибка при загрузке подписок:", err);
    res.status(500).json({ error: "failed_to_load" });
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

// --- Сохранение в Google Drive ---
app.post("/save-subs", authMiddleware, async (req, res) => {
  try {
    const { subscriptions } = req.body;
    const token = req.token;

    if (!Array.isArray(subscriptions))
      return res.status(400).json({ error: "no_subs_array" });

    // 1️⃣ Проверяем, есть ли уже файл
    const listRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&spaces=drive&fields=files(id,name,parents)",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.json();
    const fileExists = listData.files?.length > 0;
    const fileId = fileExists ? listData.files[0].id : null;

    let uploadData;

    if (fileExists) {
      // 🔄 Обновляем существующий файл без поля "parents"
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptions, null, 2),
        }
      );

      uploadData = await updateRes.json();
      console.log("💾 Обновлён subscriptions.json", uploadData);
    } else {
      // 🆕 Создаём новый файл (с parents)
      const metadata = {
        name: "subscriptions.json",
        mimeType: "application/json",
        parents: ["root"],
      };

      const form = new FormData();

      // ✅ ИСПРАВЛЕНИЕ: используем прямую JSON-строку
      form.append("metadata", JSON.stringify(metadata), {
        contentType: "application/json",
      });
      form.append("file", JSON.stringify(subscriptions, null, 2), {
        contentType: "application/json",
      });

      const createRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );

      uploadData = await createRes.json();
      console.log("💾 Создан subscriptions.json", uploadData);
    }

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

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 2525,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  timeout: 20000,
  connectionTimeout: 20000,
  socketTimeout: 20000,
});

// Создание сообщения . ПОпытка доставки писем не в спам.
const mailOptions = {
  from: `${process.env.MAIL_SENDER_NAME} <${process.env.MAIL_USER}>`,
  to: userEmail,
  subject: "Ваш список подписок SubsData",

  // ✅ ДОБАВЬТЕ СПЕЦИАЛЬНЫЕ ЗАГОЛОВКИ
  headers: {
    "X-Mailer": "SubsData Node.js App", // Помогает почтовым серверам понять, кто отправляет
  },

  // Используйте форматированный текст (text)
  text: bodyText, // Ваш текущий простой текст

  // ✅ ДОБАВЬТЕ HTML-ВЕРСИЮ ДЛЯ ЛУЧШЕЙ ДОСТАВЛЯЕМОСТИ
  html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Здравствуйте!</h2>
            <p>Ваш список подписок:</p>
            <ul>
                ${subscriptions
                  .map(
                    (sub) => `
                    <li>
                        <strong>${sub.name}</strong> &mdash; ${sub.price} ${sub.currency} 
                        (${sub.status}), категория: ${sub.category}, 
                        следующая оплата: ${sub.nextPayment}
                    </li>
                `
                  )
                  .join("")}
            </ul>
            <br>
            <p>С уважением, команда SubsData.</p>
            <hr>
            <p style="font-size: 0.8em; color: #777;">Это автоматическое уведомление. Пожалуйста, не отвечайте на него.</p>
        </div>
    `,
};

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
app.options("/api/send-subs-email", cors());

// --- ВРЕМЕННО: проверить что реально отвечает Google Drive ---
// app.get("/debug-drive", authMiddleware, async (req, res) => {
//   const token = req.token;
//   try {
//     const listRes = await fetch(
//       "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&spaces=drive&fields=files(id,name,parents)",
//       { headers: { Authorization: `Bearer ${token}` } }
//     );
//     const listData = await listRes.text(); // читаем как текст, чтобы увидеть всё
//     console.log("🔍 Ответ Google Drive /files:", listData);
//     res.send(listData);
//   } catch (err) {
//     console.error("❌ Ошибка /debug-drive:", err);
//     res.status(500).send("Ошибка при обращении к Drive");
//   }
// });

// --- Загрузка из Google Drive ---
// app.get("/api/mysubscriptions", async (req, res) => {
//   const auth = req.headers.authorization;
//   if (!auth) return res.status(401).json({ error: "Нет токена" });
//   const token = auth.split(" ")[1];

//   try {
//     // 1️⃣ Ищем файл в My Drive
//     const listRes = await fetch(
//       "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&spaces=drive&fields=files(id,name,parents)",
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     const listData = await listRes.json();
//     if (!listData.files || listData.files.length === 0) {
//       console.log("⚠️ Файл subscriptions.json не найден");
//       return res.json({ subscriptions: [] });
//     }

//     const fileId = listData.files[0].id;

//     // 2️⃣ Читаем содержимое
//     const fileRes = await fetch(
//       `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     if (!fileRes.ok) {
//       console.error("Ошибка чтения:", await fileRes.text());
//       return res.json({ subscriptions: [] });
//     }

//     const content = await fileRes.text();
//     const parsed = JSON.parse(content || "[]");
//     console.log("📥 Прочитано из Drive:", parsed.length, "подписок");

//     res.json({ subscriptions: parsed });
//   } catch (err) {
//     console.error("❌ Ошибка при получении подписок:", err);
//     res.status(500).json({ error: "Ошибка при получении подписок" });
//   }
// });

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

// --- Раздача статики ---
app.use(express.static(distPath, { index: false }));

// --- Google site verification ---
app.get("/googlea37d48efab48b1a5.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "googlea37d48efab48b1a5.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- Перехват только "неизвестных" маршрутов и отдача index.html ---
// ⚠️ В Express 5 нельзя использовать "*" — только /.* регулярку

app.get(/.*/, (req, res) => {
  // Игнорируем только API
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return res.status(404).json({ error: "API route not found" });
  }

  const indexFile = path.join(distPath, "index.html");
  res.sendFile(indexFile);
});

// --- Запуск ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
