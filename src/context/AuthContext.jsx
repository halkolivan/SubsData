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
  useEffect(() => {
    // Проверка, что библиотека gapi загружена
    if (window.google?.accounts?.oauth2?.initTokenClient) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope:
          "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file",
        callback: (resp) => {
          // Эта функция используется для loginWithGoogle, но мы её используем для рефреша
          // Логика обработки токена из resp
        },
      });
    }
  }, []);

  const refreshGoogleToken = useCallback(() => {
    return new Promise((resolve) => {
      if (!tokenClientRef.current) {
        console.error("❌ Google Token Client не инициализирован.");
        return resolve(null);
      }

      console.log("🔄 Запрос на обновление Google access_token...");

      // Используем requestAccessToken для 'silent refresh'
      tokenClientRef.current.callback = (resp) => {
        if (resp.access_token) {
          console.log("✅ Обновлён Google access_token.");
          setToken(resp.access_token);
          localStorage.setItem("authToken", resp.access_token);
          resolve(resp.access_token); // ВОЗВРАЩАЕМ НОВЫЙ ТОКЕН
        } else {
          console.error("❌ Не удалось обновить токен:", resp);
          resolve(null);
        }
      };
      tokenClientRef.current.requestAccessToken({
        prompt: "",
        callback: (resp) => {
          if (resp.error === "interaction_required") {
            console.warn("⚠️ Требуется повторная авторизация Google");
            tokenClientRef.current.requestAccessToken({ prompt: "consent" });
            return resolve(null);
          }
        },
      });

      // Принудительно запрашиваем токен
      tokenClientRef.current.requestAccessToken({ prompt: "" });
    });
  }, [setToken]);

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
  const addSubscription = (newSubscriptionData) => {
    // Создаем объект новой подписки, включая уникальный ID
    const subscriptionToAdd = {
      ...newSubscriptionData,
      id: Date.now(), // Используем метку времени для уникального ID
      currency: newSubscriptionData.currency || "USD",
      nextPayment:
        newSubscriptionData.nextPayment ||
        new Date().toISOString().split("T")[0],
    };

    try {
      // 1. Создаем АКТУАЛЬНЫЙ массив, используя текущий стейт 'subscriptions'
      // ⚠️ ВАЖНО: Мы полагаемся на то, что 'subscriptions' здесь актуален
      const updatedSubscriptions = [...subscriptions, subscriptionToAdd];

      // 2. СОХРАНЕНИЕ В LOCAL STORAGE
      const userSubscriptionKey = getUserSubscriptionKey(user?.id);

      if (userSubscriptionKey) {
        localStorage.setItem(
          userSubscriptionKey,
          JSON.stringify(updatedSubscriptions)
        );
      }

      // 3. АСИНХРОННОЕ СОХРАНЕНИЕ В GOOGLE DRIVE

      setSubscriptions(updatedSubscriptions);
      console.log("🆕 Добавлена подписка:", subscriptionToAdd);

      // ⬇️ сохраняем только после обновления стейта
      saveSubscriptionsToDrive(updatedSubscriptions).catch((errorObject) => {
        console.error(
          "❌ Асинхронная ошибка сохранения в Google Drive:",
          errorObject
        );
      });
    } catch (errorObject) {
      console.error("Ошибка при добавлении подписки:", errorObject);
    }
  };

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
      scope: "email profile openid https://www.googleapis.com/auth/drive.file",
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

  const saveSubscriptionsToDrive = useCallback(
    async (subs) => {
      // Перед performSave
      if (!token) {
        console.warn("⚠️ Токен отсутствует, пробуем обновить перед отправкой.");
        const refreshed = await refreshGoogleToken();
        if (refreshed) {
          console.log("🔑 Получен новый access_token перед сохранением");
          return await performSave(refreshed);
        }
      }

      // 🔑 Вспомогательная функция для выполнения запроса
      const performSave = async (accessToken) => {
        if (!accessToken) {
          throw new Error("User not authenticated.");
        }

        const apiResponse = await fetch("/api/save-subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // Используем переданный токен
          },
          body: JSON.stringify({ subscriptions: subs }),
        });

        if (!apiResponse.ok) {
          let errorMessage = "Неизвестная ошибка сервера";

          // 🔑 ЧИТАЕМ ТЕЛО ОТВЕТА ОДИН РАЗ, ЧТОБЫ ИЗБЕЖАТЬ ОШИБКИ ПОТОКА
          const responseText = await apiResponse.text();

          try {
            // ПЫТАЕМСЯ РАСПАРСИТЬ ТЕКСТ КАК JSON
            const serverErrorData = JSON.parse(responseText);
            errorMessage =
              serverErrorData.error || JSON.stringify(serverErrorData);
          } catch (errorObject) {
            // Если парсинг не удался (например, HTML-страница 500-й ошибки), используем сырой текст
            console.warn(
              "Внимание: Ответ сервера не является JSON. Читаем как обычный текст."
            );
            errorMessage = responseText;
          }

          console.error(
            "❌ Ошибка API при сохранении:",
            apiResponse.status,
            errorMessage
          );

          // Выбрасываем ошибку для обработки на фронтенде
          throw new Error(
            `Ошибка сохранения данных: ${errorMessage.substring(0, 100)}`
          );
        }

        // 3. Успешный ответ
        const driveData = await apiResponse.json();
        console.log(
          "✅ Данные успешно отправлены на сервер для сохранения в Google Drive.",
          driveData
        );
        return driveData;
      };

      // --- ЛОГИКА RETRY ---
      try {
        // 1. ПЕРВАЯ ПОПЫТКА: С использованием текущего токена
        console.log("Попытка сохранения с текущим токеном.");
        return await performSave(token);
      } catch (e) {
        // 2. ЕСЛИ ПЕРВАЯ ПОПЫТКА НЕ УДАЛАСЬ
        // Если это не ошибка 500 с Vercel (что мы ожидаем исправить), а 401/403, пробуем обновить токен.
        console.warn(
          "Ошибка сохранения. Инициируем обновление токена и повтор."
        );

        const newToken = await refreshGoogleToken(); // Обновляем токен

        if (!newToken) {
          // Если обновление не удалось, выбрасываем оригинальную ошибку
          console.error("❌ Не удалось обновить токен, отмена сохранения.");
          throw e;
        }

        // 3. ВТОРАЯ ПОПЫТКА: С использованием нового токена
        try {
          console.log("Повторная попытка сохранения с обновленным токеном.");
          return await performSave(newToken);
        } catch (e2) {
          // Если и вторая попытка не удалась, выбрасываем её
          console.error("❌ Вторая попытка сохранения также не удалась.");
          throw e2;
        }
      }
    },
    [token, refreshGoogleToken] // Зависимости: токен и функция рефреша
  );

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
        refreshGoogleToken,
        saveSubscriptionsToDrive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
