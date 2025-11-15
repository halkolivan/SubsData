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

  const tokenClientRef = useRef(null);

  const refreshGoogleToken = useCallback(() => {
    return new Promise((resolve) => {
      if (!tokenClientRef.current) {
        console.error("❌ Google Token Client не инициализирован.");
        return resolve(null);
      }

      console.log("🔄 Запрос на обновление Google access_token...");

      tokenClientRef.current.callback = (resp) => {
        if (resp.error === "interaction_required") {
          console.warn("⚠️ Требуется взаимодействие. Запрашиваем с consent...");
          tokenClientRef.current.requestAccessToken({ prompt: "consent" });
          return resolve(null);
        }

        if (resp.access_token) {
          console.log("✅ Google access_token обновлён.");
          setToken(resp.access_token);
          localStorage.setItem("authToken", resp.access_token);
          resolve(resp.access_token);
        } else {
          console.error("❌ Не удалось обновить токен:", resp);
          resolve(null);
        }
      };

      // Сначала пробуем без prompt
      tokenClientRef.current.requestAccessToken({ prompt: "" });
    });
  }, []);

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
    if (tokenClientRef.current && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () =>
        console.log("Google токен отозван.")
      );
    }
  };

  // --- Функция для загрузки данных из Drive ---
  const loadSubscriptionsFromDrive = useCallback(async () => {
    if (!token) return;

    // Используем VITE_API_URL, который сейчас, вероятно, установлен на HTTPS-адрес.
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

    console.log("📦 Инициируем загрузку подписок из Google Drive...");

    try {
      const response = await fetch(`${API_URL}/api/load-subscriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-cache",
      });

      if (!response.ok) {
        // Если статус не 200, пытаемся прочитать текст ошибки
        const errorText = await response.text();

        // Эта проверка помогает отловить ошибку "Unexpected token '<'"
        if (errorText.startsWith("<!DOCTYPE")) {
          console.error(
            "❌ Сервер вернул HTML вместо JSON. Проверьте развертывание или VITE_API_URL."
          );
          setSubscriptions([]);
          return;
        }

        console.error(
          `❌ Ошибка сервера (Статус ${response.status}):`,
          errorText.slice(0, 300)
        );

        if (response.status === 401 || response.status === 403) {
          console.warn(
            "⚠️ Ошибка авторизации при загрузке. Пробуем обновить токен."
          );
          const newToken = await refreshGoogleToken();
          if (newToken) {
            // В рабочем приложении тут должен быть повторный вызов loadSubscriptionsFromDrive с новым токеном.
          }
        }
        setSubscriptions([]);
        throw new Error(`Server error: ${response.status}`);
      }

      // Ответ OK, парсим JSON
      const data = await response.json();

      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
        console.log(`✅ Загружено ${data.subscriptions.length} подписок.`);
      } else {
        // Если сервер вернул пустой массив, но статус 200
        setSubscriptions([]);
        console.log("No subscriptions file found in Drive. Starting fresh.");
      }
    } catch (e) {
      console.error("❌ Ошибка при загрузке подписок из Drive:", e);
      setSubscriptions([]);
    }
  }, [token, setSubscriptions, refreshGoogleToken]);

  useEffect(() => {
    // Выполняется при изменении user или token
    if (user && token) {
      // Когда пользователь и токен доступны, начинаем загрузку
      loadSubscriptionsFromDrive();

      // ВАЖНО: Если у вас есть логика для проверки уведомлений
      // она также должна быть здесь или в отдельном useEffect, зависящем от подписок.
    } else {
      // Очистка данных при логауте
      setSubscriptions([]);
    }
  }, [user, token, loadSubscriptionsFromDrive, setSubscriptions]);  

  // --- Add Subscription ---
  const addSubscription = (newSubscriptionData) => {
    const subscriptionToAdd = {
      ...newSubscriptionData,
      id: Date.now(),
      currency: newSubscriptionData.currency || "USD",
      nextPayment:
        newSubscriptionData.nextPayment ||
        new Date().toISOString().split("T")[0],
    };

    setSubscriptions((prevSubs) => {
      const updatedSubscriptions = [...prevSubs, subscriptionToAdd];

      const userSubscriptionKey = getUserSubscriptionKey(user?.id);

      if (userSubscriptionKey) {
        localStorage.setItem(
          userSubscriptionKey,
          JSON.stringify(updatedSubscriptions) // Используем АКТУАЛЬНЫЙ массив
        );
      }
      saveSubscriptionsToDrive(updatedSubscriptions).catch((errorObject) => {
        console.error(
          "❌ Асинхронная ошибка сохранения в Google Drive:",
          errorObject
        );
      });
      console.log("🆕 Добавлена подписка:", subscriptionToAdd);
      return updatedSubscriptions;
    });
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
          const responseText = await apiResponse.text();
          try {
            const serverErrorData = JSON.parse(responseText);
            errorMessage =
              serverErrorData.error || JSON.stringify(serverErrorData);
          } catch (errorObject) {
            console.warn(
              "Внимание: Ответ сервера не является JSON. Читаем как обычный текст."
            );
            errorMessage = responseText;
          }

          if (driveData.fileId) {
            // ✅ СОХРАНЯЕМ ID В ЛОКАЛЬНОЕ ХРАНИЛИЩЕ
            localStorage.setItem("driveFileId", driveData.fileId);
          }

          console.error(
            "❌ Ошибка API при сохранении:",
            apiResponse.status,
            errorMessage
          );

          const errorToThrow = new Error(
            `Ошибка сохранения данных: ${errorMessage.substring(0, 100)}`
          );
          errorToThrow.status = apiResponse.status; // 💡 ДОБАВЛЕНО
          throw errorToThrow;
        }
        try {
          // 1. ПЕРВАЯ ПОПЫТКА
          return await performSave(token);
        } catch (e) {
          // 2. ЕСЛИ ПЕРВАЯ ПОПЫТКА НЕ УДАЛАСЬ
          console.warn("Ошибка сохранения. Проверяем причину...");

          // 💡 ИСПРАВЛЕНО: Проверяем, является ли ошибка 401 или 403 (авторизация)
          if (e.status === 401 || e.status === 403) {
            console.log(
              "Ошибка авторизации. Инициируем обновление токена и повтор."
            );
            // ... (логика обновления токена и повторной попытки)
          } else {
            // Если это не 401/403 (например, 500), сразу выбрасываем ошибку
            console.error(
              `❌ Неизвестная ошибка (Статус ${
                e.status || "N/A"
              }). Не повторяем.`
            );
            throw e;
          }
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

        if (e.status === 401 || e.status === 403) {
          // 👈 ТОЛЬКО ЗДЕСЬ ОБНОВЛЯЕМ ТОКЕН
          console.log(
            "Ошибка авторизации. Инициируем обновление токена и повтор."
          );
          const newToken = await refreshGoogleToken();

          if (!newToken) {
            console.error("❌ Не удалось обновить токен, отмена сохранения.");
            throw e;
          }

          // 3. ВТОРАЯ ПОПЫТКА
          try {
            console.log("Повторная попытка сохранения с обновленным токеном.");
            return await performSave(newToken);
          } catch (e2) {
            console.error("❌ Вторая попытка сохранения также не удалась.");
            throw e2;
          }
        } else {
          // Если это 500 (ошибка сервера), сразу выбрасываем ошибку
          console.error(
            `❌ Неизвестная ошибка (Статус ${e.status || "N/A"}). Не повторяем.`
          );
          throw e;
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
