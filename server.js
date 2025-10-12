import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Определяем __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Порт и папка билда
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, "dist");

console.log("✅ Server starting...");
console.log("🗂️  Serving static files from:", distPath);

// Настройки безопасности
app.disable("x-powered-by");

// Разрешаем статику
app.use(express.static(distPath, { extensions: ["html", "js", "css", "mjs"] }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Тестовый API (для отладки)
app.get("/api/health", (req, res) => {
  console.log("💓 /api/health called");
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Все остальные запросы направляем на index.html
app.get("/*", (req, res) => {
  console.log(`📄 Serving index.html for: ${req.url}`);
  res.sendFile(path.join(distPath, "index.html"));
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err.stack || err);
  res.status(500).send("Internal server error");
});

// Запуск
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});
