import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      // ВАЖНО: allow popups, чтобы Google popup мог корректно закрываться
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      // COEP убираем/делаем нестрогим
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
