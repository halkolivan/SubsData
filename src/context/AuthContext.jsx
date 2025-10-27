import { useState, useEffect, useCallback } from "react";
import { notifySubscriptions } from "@/hooks/useNotifyDataSub";
import { AuthContext } from "./auth-context-export.js";

// ✅ 1. ПРОВЕРКА ENV: GOOGLE_CLIENT_ID и API_URL
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  // --- Состояния ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || null
  );

  // 2. КОРРЕКЦИЯ: Инициализация subscriptions из localStorage
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem("userSubscriptions");
    // Если токен есть, загружаем сохраненное
    return localStorage.getItem("authToken") && saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : { currency: { main: "USD" } };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // --- Асинхронная функция загрузки подписок ---
  const loadSubscriptions = useCallback(async (token, setSubscriptions) => {
    if (!token || !API_URL) return;

    try {
      const res = await fetch(`${API_URL}/get-subs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.subscriptions && Array.isArray(data.subscriptions)) {
        console.log("✅ Подписки успешно загружены с Google Drive");
        setSubscriptions(data.subscriptions);
        localStorage.setItem(
          "userSubscriptions",
          JSON.stringify(data.subscriptions)
        );
      } else if (res.status === 404 || res.status === 403) {
        console.log(
          "⚠️ Файл подписок не найден или нет доступа. Начинаем с пустого списка."
        );
        setSubscriptions([]);
        localStorage.removeItem("userSubscriptions");
      } else {
        console.error(
          "❌ Ошибка загрузки подписок с сервера:",
          data.error || res.statusText
        );
      }
    } catch (error) {
      console.error("❌ Ошибка fetch при загрузке данных:", error);
    }
  }, []);

  // --- Функция входа ---
  const login = (userData, accessToken) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", accessToken);
    setUser(userData);
    setToken(accessToken);
    setJustLoggedIn(true);

    // 3. ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Запуск загрузки данных сразу после логина
    setSubscriptions([]);
    loadSubscriptions(accessToken, setSubscriptions);
  };

  // --- Функция выхода ---
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userSubscriptions");
    setUser(null);
    setToken(null);
    setSubscriptions([]);
  };

  // --- Автообновление access_token и загрузка при монтировании ---
  useEffect(() => {
    // 4. ✅ ИСПРАВЛЕНИЕ: Блокируем, если нет GOOGLE_CLIENT_ID или библиотеки
    if (!GOOGLE_CLIENT_ID || typeof window.google === "undefined") return;

    // Загрузка данных при старте, если токен есть
    if (token && subscriptions.length === 0) {
      loadSubscriptions(token, setSubscriptions);
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file email profile",
      callback: (resp) => {
        if (resp?.access_token) {
          console.log("🔄 Обновлён Google access_token");
          setToken(resp.access_token);
          localStorage.setItem("authToken", resp.access_token);
          // После обновления токена, убедимся, что данные загружены
          loadSubscriptions(resp.access_token, setSubscriptions);
        }
      },
    });

    const interval = setInterval(() => {
      if (token) {
        tokenClient.requestAccessToken();
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token]);

  // --- Добавление подписки ---
  const addSubscription = async (newSub) => {
    const subToAdd = {
      id: Date.now(),
      name: newSub.name || "Новая подписка",
      price: parseFloat(newSub.price) || 0,
      currency: newSub.currency || "USD",
      category: newSub.category || "Прочее",
      nextPayment: newSub.nextPayment || new Date().toISOString().split("T")[0],
      period: newSub.period || "Ежемесячно",
      status: newSub.status || "active",
    };

    try {
      // ИСПРАВЛЕНО: используем state `subscriptions`
      const updated = [...subscriptions, subToAdd];
      localStorage.setItem("userSubscriptions", JSON.stringify(updated));
      setSubscriptions(updated);

      await saveSubscriptionsToDrive(updated);

      console.log("🆕 Добавлена подписка:", subToAdd);
    } catch (err) {
      console.error("Ошибка при добавлении подписки:", err);
    }
  };

  const saveSubscriptionsToDrive = useCallback(
    async (subsArray) => {
      if (!token || subsArray.length === 0) return;

      try {
        const res = await fetch(`${API_URL}/save-subs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscriptions: subsArray }),
        });

        if (res.ok) {
          console.log("💾 ✅ Состояние успешно сохранено в Google Drive.");
        } else {
          console.error("❌ Ошибка при сохранении в Drive:", await res.json());
        }
      } catch (err) {
        console.error("❌ Ошибка fetch при сохранении в Drive:", err);
      }
    },
    [token, API_URL]
  ); // Зависимость от токена

  // --- Настройки ---
  const updateSettings = (patch) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      notif: { ...(prev.notif || {}), ...(patch.notif || {}) },
      currency: { ...(prev.currency || {}), ...(patch.currency || {}) },
    }));
    // Сохранение настроек в localStorage
    localStorage.setItem("userSettings", JSON.stringify(settings));
  };

  // --- Уведомления после логина ---
  useEffect(() => {
    if (justLoggedIn) {
      notifySubscriptions(subscriptions);
      setJustLoggedIn(false);
    }
  }, [justLoggedIn, subscriptions]);

  // --- Возврат контекста ---
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isAddModalOpen,
        setIsAddModalOpen,
        addSubscription,
        subscriptions,
        setSubscriptions,
        settings,
        updateSettings,
        saveSubscriptionsToDrive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
