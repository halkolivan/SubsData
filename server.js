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

// Serve service worker if present; otherwise return a small no-op SW to avoid 404s
app.get('/sw.js', (req, res) => {
  const swFile = path.join(distPath, 'sw.js');
  if (fs.existsSync(swFile)) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(swFile);
  }
  // minimal noop service worker
  res.setHeader('Content-Type', 'application/javascript');
  res.send("// noop service worker\nself.addEventListener('install', ()=>self.skipWaiting());\nself.addEventListener('activate', ()=>self.clients.claim());\n");
});

app.use(express.static(distPath));

// Serve locale files explicitly and log when missing
app.get('/locales/*', (req, res) => {
  const rel = req.path.replace(/^\//, '');
  const fileOnDisk = path.join(distPath, rel);
  if (fs.existsSync(fileOnDisk)) {
    console.log(`200 Serve locale: ${req.method} ${req.url} -> ${fileOnDisk}`);
    return res.sendFile(fileOnDisk);
  }
  console.warn(`404 locale not found: ${req.method} ${req.url} -> ${fileOnDisk}`);
  return res.status(404).send('Not found');
});

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
    // mark response so we can detect what was served in the browser/network
    res.setHeader("X-Served-Index", "dist");
    console.log(`200 Serve index.html for ${req.method} ${req.url} -> ${indexHtml}`);
    res.sendFile(indexHtml);
  } else {
    console.error("index.html not found in dist folder:", indexHtml);
    res.status(500).send("index.html not found");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
