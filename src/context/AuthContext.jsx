import { useState, useEffect, useCallback, useRef } from "react";
import { notifySubscriptions } from "@/hooks/useNotifyDataSub";
// ✅ Импортируем AuthContext из отдельного файла, как вы просили
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

  const [subscriptions, setSubscriptions] = useState([]);

  // const [subscriptions, setSubscriptions] = useState(() => {
  //   const saved = localStorage.getItem("userSubscriptions");
  //   return localStorage.getItem("authToken") && saved ? JSON.parse(saved) : [];
  // });

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
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", authToken);
    setIsAuthModalOpen(false);
    setJustLoggedIn(true);

    // 2. ✅ КОРРЕКТНАЯ ЗАГРУЗКА ИЗ LOCAL STORAGE ПОСЛЕ ЛОГИНА
    const userSubKey = getUserSubscriptionKey(userData.id);
    if (userSubKey) {
      const savedSubs = localStorage.getItem(userSubKey);
      if (savedSubs) {
        try {
          const subs = JSON.parse(savedSubs);
          setSubscriptions(subs);
          console.log(`✅ Подписки загружены для ID: ${userData.id}`);
        } catch (e) {
          console.error("❌ Ошибка парсинга локальных подписок:", e);
          setSubscriptions([]);
        }
      } else {
        setSubscriptions([]); // Нет данных для этого ID
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSubscriptions([]);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    // localStorage.removeItem("userSubscriptions");
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
      if (!user?.id) {
        console.warn("⚠️ Невозможно сохранить: пользователь не авторизован.");
        return;
      }

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
        localStorage.setItem(userSubKey, JSON.stringify(updated));
        setSubscriptions(updated);
        console.log("🆕 Добавлена подписка:", subToAdd);
      } catch (err) {
        console.error("Ошибка при добавлении подписки:", err);
      }
    },
    [subscriptions, user]
  );

  // --- Обновление access_token (Инициализация клиента) ---
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
          // Если пользователь есть, но данных нет по уникальному ключу
          setSubscriptions([]);
        }
      } else {
        // Если пользователь не авторизован, очищаем состояние
        setSubscriptions([]);
      }
    }, [user]);

    // Периодическая проверка и обновление токена (каждые 50 минут)
    const interval = setInterval(() => {
      if (tokenClientRef.current) {
        tokenClientRef.current.requestAccessToken({ prompt: "" });
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // ✅ ИСПРАВЛЕННАЯ АСИНХРОННАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ТОКЕНА
  // Возвращает Promise, который разрешается с новым токеном или null.
  const refreshAccessToken = useCallback(() => {
    // Проверка, которая предотвращает ошибку "Google Token Client не инициализирован"
    if (!tokenClientRef.current) {
      console.error("Google Token Client не инициализирован.");
      return Promise.resolve(null); // Безопасный выход
    }

    // Оборачиваем вызов в Promise для использования с await
    return new Promise((resolve) => {
      tokenClientRef.current.requestAccessToken({
        prompt: "",
        callback: (resp) => {
          if (resp?.access_token) {
            console.log("🔄 Обновлён Google access_token (Принудительно)");
            setToken(resp.access_token);
            localStorage.setItem("authToken", resp.access_token);
            resolve(resp.access_token); // ВОЗВРАЩАЕМ НОВЫЙ ТОКЕН
          } else {
            console.error("❌ Не удалось обновить токен:", resp);
            resolve(null); // Разрешаем с null в случае ошибки
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
      // ✅ Исправлено: Сохраняем НОВОЕ состояние в localStorage
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
