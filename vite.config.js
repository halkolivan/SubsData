import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA({
    //   srcDir: "./", // указывает корень проекта
    //   outDir: "dist", // папка для собранного сайта
    //   registerType: "autoUpdate",
    //   devOptions: { enabled: false }, // временно отключил перед билдом проекта
    //   includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
    //   manifest: {
    //     name: "SubsData",
    //     short_name: "SubsData",
    //     description: "Управляй своими подписками удобно и просто.",
    //     theme_color: "#ffffff",
    //     background_color: "#ffffff",
    //     display: "standalone",
    //     orientation: "portrait",
    //     start_url: "/",
    //     scope: "/",
    //     lang: "ru",
    //     icons: [
    //       { src: "/icons/PWA192.png", sizes: "192x192", type: "image/png" },
    //       { src: "/icons/PWA512.png", sizes: "512x512", type: "image/png" },
    //       {
    //         src: "/icons/PWA512.png",
    //         sizes: "512x512",
    //         type: "image/png",
    //         purpose: "maskable",
    //       },
    //     ],
    //   },
    //   workbox: {
    //     cleanupOutdatedCaches: true,
    //     clientsClaim: true,
    //     skipWaiting: true,
    //     runtimeCaching: [
    //       {
    //         urlPattern: ({ request }) => request.destination === "document",
    //         handler: "NetworkFirst",
    //         options: { cacheName: "html-cache" },
    //       },
    //       {
    //         urlPattern: ({ request }) =>
    //           request.destination === "script" ||
    //           request.destination === "style",
    //         handler: "StaleWhileRevalidate",
    //         options: { cacheName: "static-resources" },
    //       },
    //       {
    //         urlPattern: ({ request }) => request.destination === "image",
    //         handler: "CacheFirst",
    //         options: {
    //           cacheName: "image-cache",
    //           expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
    //         },
    //       },
    //     ],
    //   },
    // }),
  ],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // только корневой index.html
      // Можно игнорировать node_modules через external
      external: (id) => id.includes("node_modules"),
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
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
