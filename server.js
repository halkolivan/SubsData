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

// Log missing static asset requests (so missing JS/CSS/images are visible in logs)
app.use((req, res, next) => {
  const urlPath = req.path || req.url || "";
  const staticExt = /\.(js|css|png|jpg|jpeg|svg|webmanifest|ico|json)$/i;
  if (staticExt.test(urlPath) || urlPath.startsWith("/assets/") || urlPath.startsWith("/icons/")) {
    // map URL path to file in dist
    const fileOnDisk = path.join(distPath, urlPath.replace(/^\//, ""));
    if (!fs.existsSync(fileOnDisk)) {
      console.warn(`404 static asset not found: ${req.method} ${req.url} -> ${fileOnDisk}`);
      return res.status(404).send("Not found");
    }
  }
  next();
});

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
