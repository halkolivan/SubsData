import { useState, useEffect, useCallback, useRef } from "react";
import { notifySubscriptions } from "@/hooks/useNotifyDataSub";
import { AuthContext } from "./auth-context-export.js";

// --- Константы ENV ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// 🔑 Функция для получения уникального ключа подписок
const getUserSubscriptionKey = (userId) => {
  return userId ? `userSubscriptions_${userId}` : null;
};

export const AuthProvider = ({ children }) => {
  // --- Состояния ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || null
  );

  // ✅ ИСПРАВЛЕНО: Инициализируем пустым массивом.
  // Загрузка будет происходить в useEffect (ниже)
  const [subscriptions, setSubscriptions] = useState([]);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : { currency: { main: "USD" } };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // ✅ Ref для хранения объекта токен-клиента Google
  const tokenClientRef = useRef(null);

  // --- Login / Logout ---
  const login = (userData, authToken) => {
    // 1. Установка состояний React
    setUser(userData);
    setToken(authToken);

    // 2. Сохранение данных в локальном хранилище
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", authToken);

    // 3. Управление модальными окнами и флагами
    setIsAuthModalOpen(false);
    setJustLoggedIn(true);

    // 4. Загрузка подписок по уникальному ID
    const userSubKey = getUserSubscriptionKey(userData.id);

    if (userSubKey) {
      const savedSubs = localStorage.getItem(userSubKey);

      if (savedSubs) {
        try {
          const subscriptionsFromStorage = JSON.parse(savedSubs);
          setSubscriptions(subscriptionsFromStorage);
          console.log(`Subscriptions loaded for ID: ${userData.id}`);
        } catch (error) {
          console.error("Error parsing local subscriptions:", error);
          setSubscriptions([]);
        }
      } else {
        setSubscriptions([]);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSubscriptions([]);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    // ✅ Данные подписок остаются, привязанные к ID.

    // Отзыв токена Google
    if (tokenClientRef.current && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () =>
        console.log("Google токен отозван.")
      );
    }
  };

  // --- Add Subscription ---
  const addSubscription = useCallback(
    (newSub) => {
      // Проверка, что пользователь авторизован и имеет ID      
      const subToAdd = {
        ...newSub,
        id: Date.now(),
        currency: newSub.currency || "USD",
        nextPayment:
          newSub.nextPayment || new Date().toISOString().split("T")[0],
      };

      try {
        const updated = [...subscriptions, subToAdd];

        // 🔑 СОХРАНЕНИЕ ПО УНИКАЛЬНОМУ КЛЮЧУ
        const userSubKey = getUserSubscriptionKey(user.id);

        if (userSubKey) {
          localStorage.setItem(userSubKey, JSON.stringify(updated));
        }

        setSubscriptions(updated);
        console.log("🆕 Добавлена подписка:", subToAdd);
      } catch (err) {
        console.error("Ошибка при добавлении подписки:", err);
      }
    },
    [subscriptions, user]
  );

  // 1. ✅ ИСПРАВЛЕНО: ОТДЕЛЬНЫЙ useEffect для загрузки подписок при перезагрузке.
  // Запускается при изменении объекта user.
  useEffect(() => {
    if (user?.id) {
      const userSubKey = getUserSubscriptionKey(user.id);
      const savedSubs = localStorage.getItem(userSubKey);

      if (savedSubs) {
        try {
          const subs = JSON.parse(savedSubs);
          setSubscriptions(subs);
          console.log(`✅ Восстановление подписок для ID: ${user.id}`);
        } catch (e) {
          console.error("❌ Ошибка восстановления локальных подписок:", e);
          setSubscriptions([]);
        }
      } else {
        setSubscriptions([]);
      }
    } else {
      // Если пользователь не авторизован, очищаем состояние
      setSubscriptions([]);
    }
  }, [user]);

  // 2. ✅ ИСПРАВЛЕНО: ОТДЕЛЬНЫЙ useEffect для инициализации Google-клиента.
  useEffect(() => {
    // Выполняется один раз при монтировании компонента.
    if (!window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) return;

    // Инициализируем объект и сохраняем его в Ref
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "email profile",
      callback: (resp) => {
        if (resp?.access_token) {
          console.log("🔄 Автоматически обновлён Google access_token (Авто)");
          setToken(resp.access_token);
          localStorage.setItem("authToken", resp.access_token);
        }
      },
    });

    // Периодическая проверка и обновление токена (каждые 50 минут)
    const interval = setInterval(() => {
      if (tokenClientRef.current) {
        tokenClientRef.current.requestAccessToken({ prompt: "" });
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, []); // Зависимости нет, работает как componentDidMount

  // ✅ АСИНХРОННАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ТОКЕНА
  const refreshAccessToken = useCallback(() => {
    if (!tokenClientRef.current) {
      console.error("Google Token Client не инициализирован.");
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      tokenClientRef.current.requestAccessToken({
        prompt: "",
        callback: (resp) => {
          if (resp?.access_token) {
            console.log("🔄 Обновлён Google access_token (Принудительно)");
            setToken(resp.access_token);
            localStorage.setItem("authToken", resp.access_token);
            resolve(resp.access_token);
          } else {
            console.error("❌ Не удалось обновить токен:", resp);
            resolve(null);
          }
        },
      });
    });
  }, [setToken]);

  // --- Настройки ---
  const updateSettings = (patch) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        ...patch,
        notif: { ...(prev.notif || {}), ...(patch.notif || {}) },
        currency: { ...(prev.currency || {}), ...(patch.currency || {}) },
      };
      localStorage.setItem("userSettings", JSON.stringify(newSettings));
      return newSettings;
    });
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
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
