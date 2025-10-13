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
// parse JSON bodies for POST /auth/github
app.use(express.json());

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

// Serve icons explicitly (avoid possible static middleware issues on some hosts)
app.get(/^\/icons\/.*/, (req, res) => {
  const rel = req.path.replace(/^\//, '');
  const fileOnDisk = path.join(distPath, rel);
  if (fs.existsSync(fileOnDisk)) {
    console.log(`200 Serve icon: ${req.method} ${req.url} -> ${fileOnDisk}`);
    return res.sendFile(fileOnDisk);
  }
  console.warn(`404 icon not found: ${req.method} ${req.url} -> ${fileOnDisk}`);
  return res.status(404).send('Not found');
});

// Serve locale files explicitly and log when missing (placed before static)
app.get(/^\/locales\/.*/, (req, res) => {
  const rel = req.path.replace(/^\//, '');
  const fileOnDisk = path.join(distPath, rel);
  if (fs.existsSync(fileOnDisk)) {
    console.log(`200 Serve locale: ${req.method} ${req.url} -> ${fileOnDisk}`);
    return res.sendFile(fileOnDisk);
  }
  console.warn(`404 locale not found: ${req.method} ${req.url} -> ${fileOnDisk}`);
  return res.status(404).send('Not found');
});

// Diagnostic endpoint: list files in dist (assets, icons, locales)
app.get('/__assets', (req, res) => {
  try {
    const listDir = (p) => {
      const full = path.join(distPath, p);
      if (!fs.existsSync(full)) return null;
      return fs.readdirSync(full);
    };
    return res.json({
      assets: listDir('assets'),
      icons: listDir('icons'),
      locales: listDir('locales'),
    });
  } catch (err) {
    console.error('Error listing dist folders', err);
    return res.status(500).json({ error: 'failed to list' });
  }
});

// Add a small token-exchange endpoint so frontend can POST code -> server and get user/token
// Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables set on the host.
app.post('/auth/github', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'missing_code' });

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: 'missing_github_client_env' });
  }

  try {
    // Exchange code for access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const tokenJson = await tokenResp.json();
    if (tokenJson.error) return res.status(500).json({ error: tokenJson.error_description || tokenJson.error });

    const access_token = tokenJson.access_token;

    // Fetch user profile
    const userResp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}`, Accept: 'application/vnd.github.v3+json' },
    });
    const user = await userResp.json();

    return res.json({ user, token: access_token });
  } catch (err) {
    console.error('GitHub exchange error', err);
    return res.status(500).json({ error: 'github_exchange_failed' });
  }
});

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

// SPA fallback: serve index.html for any other GET requests (use RegExp to avoid path parsing issues)
app.get(/.*/, (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.setHeader('X-Served-Index', 'true');
    return res.sendFile(indexFile);
  }
  return res.status(404).send('Not found');
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
