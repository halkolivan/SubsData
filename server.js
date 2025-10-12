// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Определяем __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, "dist");

console.log("✅ Server starting...");
console.log("🗂️ Serving static files from:", distPath);

// Безопасность
app.disable("x-powered-by");

// Раздаём статику
app.use(
  express.static(distPath, {
    extensions: ["html", "js", "css", "mjs"],
  })
);

// Логирование
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Проверка API
app.get("/api/health", (req, res) => {
  console.log("💓 /api/health called");
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ВАЖНО: вместо "/*" используем правильный RegExp
app.get(/.*/, (req, res) => {
  console.log(`📄 Serving index.html for: ${req.url}`);
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      console.error("❌ Error sending index.html:", err);
      res.status(500).send("Error loading page");
    }
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err.stack || err);
  res.status(500).send("Internal server error");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});
