import path from "path";
import express from "express";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к папке dist
const distPath = path.join(__dirname, "dist");
console.log("🗂 Serving static from:", distPath);

const app = express();
app.use(express.static(distPath));

// Catch-all route for SPA: use a RegExp route to avoid path-to-regexp parameter parsing issues
app.get(/.*/, (req, res) => {
  const indexHtml = path.join(distPath, "index.html");
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    console.error("index.html not found in dist folder:", indexHtml);
    res.status(500).send("index.html not found");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
