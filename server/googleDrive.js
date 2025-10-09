// server/googleDrive.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// === Сохранение данных (subscriptions.json) ===
router.post("/save", async (req, res) => {
  const { access_token, data } = req.body;
  if (!access_token || !data) {
    console.log("❌ /drive/save — нет токена или данных");
    return res.status(400).json({ error: "Missing data" });
  }

  console.log("⚡ /drive/save — запрос на сохранение данных");

  try {
    const metadata = {
      name: "subscriptions.json",
      mimeType: "application/json",
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append(
      "file",
      new Blob([JSON.stringify(data)], { type: "application/json" })
    );

    const upload = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}` },
        body: form,
      }
    );

    const result = await upload.json();
    console.log("✅ Файл сохранён в Drive:", result);

    res.json(result);
  } catch (err) {
    console.error("❌ Ошибка при сохранении в Drive:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// === Загрузка данных из Drive ===
router.post("/load", async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    console.log("❌ /drive/load — нет токена");
    return res.status(400).json({ error: "Missing token" });
  }

  console.log("⚡ /drive/load — запрос на загрузку данных");

  try {
    const filesResp = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=name='subscriptions.json'&fields=files(id)",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const files = await filesResp.json();
    console.log("🔍 Найдены файлы:", files);

    if (!files.files.length) {
      console.log("ℹ️ Файл subscriptions.json не найден в Google Drive");
      return res.json({ data: null });
    }

    const fileId = files.files[0].id;
    const contentResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const data = await contentResp.json();

    console.log("✅ Данные загружены из Drive:", data);
    res.json({ data });
  } catch (err) {
    console.error("❌ Ошибка при загрузке из Drive:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
