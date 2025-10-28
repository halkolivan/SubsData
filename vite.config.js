import path from "path";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: "src",
  base: "/",
  publicDir: path.resolve(__dirname, "public"),

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      srcDir: "./",
      outDir: "dist",
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "auto",
      ],
      manifest: {
        name: "SubsData",
        short_name: "SubsData",
        description: "Управляй своими подписками удобно и просто.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "ru",
        icons: [
          { src: "/icons/PWA192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/PWA512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/PWA512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        exclude: ["index.html"],
        runtimeCaching: [
          // HTML — network first
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: { cacheName: "html-cache" },
          },
          // JS & CSS — network first
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "NetworkFirst",
            options: { cacheName: "static-resources" },
          },
          // Images — cache first
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],

  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: { protocol: "ws", host: "localhost" },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@mock": path.resolve(__dirname, "mock"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },
});
