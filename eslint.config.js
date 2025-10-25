import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Игнорируем папку сборки
  globalIgnores(["dist", "node_modules"]),

  // ===================================
  // 1. КОНФИГУРАЦИЯ ДЛЯ ФРОНТЕНДА (React/JSX)
  // Применяется ко всем JS/JSX, кроме server.js
  // ===================================
  {
    files: ["**/*.{js,jsx}"],
    // Исключаем бэкенд-файл из браузерной конфигурации
    ignores: ["server.js"],

    // Подключаем стандартные рекомендации и плагины React
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: 2020,
      // Указываем БРАУЗЕРНУЮ среду
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },

    // Ваши пользовательские правила для фронтенда
    rules: {
      // Игнорируем неиспользуемые переменные, начинающиеся с заглавной буквы (например, React компоненты)
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },

  // ===================================
  // 2. КОНФИГУРАЦИЯ ДЛЯ БЭКЕНДА (server.js)
  // Применяется только к файлу server.js
  // ===================================
  {
    files: ["server.js"],

    // Подключаем только стандартные рекомендации
    extends: [js.configs.recommended],

    languageOptions: {
      ecmaVersion: 2020,
      // Указываем среду NODE.JS (она включает process и другие глобальные объекты)
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },

    // Правила для бэкенда
    rules: {
      // На бэкенде console.log часто нужен
      "no-console": "off",
    },
  },
]);
