import { subscriptions as mockSubs } from "@mock/mockData";
import { notifySubscriptions } from "@/hooks/useNotifyDataSub";
import { createContext, useContext, useState, useEffect } from "react";

// 1️⃣ Создаём контекст
export const AuthContext = createContext();

// 2️⃣ Провайдер
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || null
  );

  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem("subscriptions");
    return saved ? JSON.parse(saved) : [];
  });

  const [userSubscriptions, setUserSubscriptions] = useState(() => {
    const saved = localStorage.getItem("userSubscriptions");
    return saved ? JSON.parse(saved) : [];
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const defaultSettings = {
    notif: {
      enabled: true,
      time: "09:00",
      frequency: "daily",
      weeklyDays: {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false,
      },
    },
    currency: {
      defaultCurrency: "USD",
      showOriginalCurrency: true,
      rates: { USD: 1, EUR: 0.92, RUB: 80, MDL: 18.0, GBP: 0.79 },
    },
    dateFormat: "DD.MM.YYYY",
  };

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // Сохраняем подписки и настройки в localStorage
  useEffect(() => {
    localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem(
      "userSubscriptions",
      JSON.stringify(userSubscriptions)
    );
  }, [userSubscriptions]);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  // Функции
  const login = async (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", jwt);

    try {
      // ✅ Подставляем адрес API из .env (в продакшне Render = subsdata-api.onrender.com)
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";      

      const res = await fetch(`${API_URL}/mysubscriptions`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });


      const data = await res.json();

      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
      }
    } catch (err) {
      console.error("Ошибка при загрузке подписок:", err);
    }

    setIsAuthModalOpen(false);
    setIsAddModalOpen(false);
    setJustLoggedIn(true);
  };


  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setSubscriptions([]);
  };

  const loadMockSubscriptions = () => setSubscriptions(mockSubs);

  const addSubscription = async (newSub) => {
    const subToAdd = {
      id: Date.now(),
      name: newSub.name,
      price: parseFloat(newSub.price),
      currency: newSub.currency || "USD",
      category: newSub.category,
      nextPayment: newSub.nextPayment,
      cycle: "ежемесячно",
      status: newSub.status || "active",
    };

    setSubscriptions((prev) => {
      const updated = [...prev, subToAdd];
      localStorage.setItem("subscriptions", JSON.stringify(updated));
      // Сохраняем на Google Drive
      if (token) {
        import("@/utils/drive").then(({ saveSubscriptions }) => {
          saveSubscriptions(token, updated)
            .then(() => console.log("✅ Сохранено на Google Drive"))
            .catch((err) => console.error("❌ Ошибка при сохранении:", err));
        });
      }
      return updated;
    });
  };

  const updateSettings = (patch) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      notif: { ...(prev.notif || {}), ...(patch.notif || {}) },
      currency: { ...(prev.currency || {}), ...(patch.currency || {}) },
    }));
  };

  useEffect(() => {
    if (justLoggedIn) {
      notifySubscriptions(mockSubs);
      setJustLoggedIn(false);
    }
  }, [justLoggedIn]);

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
        subscriptions,
        setSubscriptions,
        loadMockSubscriptions,
        addSubscription,
        settings,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 3️⃣ Удобный хук
export const useAuth = () => useContext(AuthContext);
