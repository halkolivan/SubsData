import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// 1️⃣ Создаём контекст
export const AuthContext = createContext();

// 2️⃣ Хук для доступа к контексту
export const useAuth = () => useContext(AuthContext);

// 3️⃣ Провайдер с логикой GIS
export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]); // если у тебя есть глобальный стейт

  // --- Инициализация Google Identity Services ---
  useEffect(() => {
    if (!window.google) {
      console.error("❌ Google Identity Services не загружен");
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id:
        "408629276793-90jf6aqt0lupftengqnodqd0dgnl2lck.apps.googleusercontent.com",
      scope:
        "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
      prompt: "", // 🔥 Не запрашивать логин заново, если токен истёк
      callback: (response) => {
        console.log("🔑 Новый токен:", response.access_token);
        setAccessToken(response.access_token);
      },
    });

    setTokenClient(client);
  }, []);

  // --- Запрос access_token (обновляет при необходимости) ---
  const ensureAccessToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        reject("Google Client не инициализирован");
        return;
      }

      if (accessToken) {
        // Уже есть действующий токен
        resolve(accessToken);
      } else {
        console.log("🔄 Запрашиваем новый токен у Google...");
        tokenClient.callback = (res) => {
          if (res.access_token) {
            setAccessToken(res.access_token);
            resolve(res.access_token);
          } else {
            reject("Не удалось получить access_token");
          }
        };
        tokenClient.requestAccessToken(); // GIS сам обновит токен без логина
      }
    });
  }, [tokenClient, accessToken]);

  // --- Функция сохранения в Google Drive через сервер ---
  const saveSubscriptionsToDrive = useCallback(
    async (subs) => {
      const token = await ensureAccessToken();
      console.log("📤 Отправляем данные в /api/save-subscriptions...");

      const res = await fetch("/api/save-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptions: subs }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Ошибка при сохранении:", res.status, text);
        throw new Error(`Ошибка при сохранении: ${res.status}`);
      }

      const json = await res.json();
      console.log("✅ Успешно сохранено:", json);
      return json;
    },
    [ensureAccessToken]
  );

  // --- Контекстные данные ---
  const value = {
    accessToken,
    tokenClient,
    subscriptions,
    setSubscriptions,
    saveSubscriptionsToDrive,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
