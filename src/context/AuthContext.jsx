import { subscriptions as mockSubs } from "@mock/mockData";
import { notifySubscriptions } from "@/hooks/useNotifyDataSub";
import { createContext, useContext, useState, useEffect } from "react";
import { saveSubscriptions } from "@/utils/drive"; // <--- добавлен импорт

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // --- Состояния ---
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

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // --- Настройки пользователя ---
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

  // --- Сохранение в localStorage ---
  useEffect(() => {
    localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  // --- Автосохранение на Google Drive ---
  useEffect(() => {
    if (token && subscriptions.length > 0) {
      console.log("🌀 Автосохранение на Google Drive...");
      console.log("📦 Текущее состояние подписок:", subscriptions);

      saveSubscriptions(token, subscriptions)
        .then(() => console.log("✅ Автосохранено на Google Drive"))
        .catch((err) => console.error("❌ Ошибка автосохранения:", err));
    }
  }, [subscriptions, token]);

  // --- Авторизация ---
  const login = async (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", jwt);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
      const res = await fetch(`${API_URL}/mysubscriptions`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (data.subscriptions) setSubscriptions(data.subscriptions);
    } catch (err) {
      console.error("Ошибка при загрузке подписок:", err);
    }

    setIsAuthModalOpen(false);
    setIsAddModalOpen(false);
    setJustLoggedIn(true);
  };

  // --- Выход ---
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setSubscriptions([]);
  };

  // --- Добавление подписки ---
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

    try {
      const existing = JSON.parse(localStorage.getItem("subscriptions")) || [];
      const updated = [...existing, subToAdd];
      localStorage.setItem("subscriptions", JSON.stringify(updated));
      setSubscriptions(updated);

      console.log("🆕 Добавлена подписка:", subToAdd);
      console.log("📦 Текущее состояние:", updated);
    } catch (err) {
      console.error("Ошибка при добавлении подписки:", err);
    }
  };

  // --- Настройки ---
  const updateSettings = (patch) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      notif: { ...(prev.notif || {}), ...(patch.notif || {}) },
      currency: { ...(prev.currency || {}), ...(patch.currency || {}) },
    }));
  };

  // --- Уведомления после логина ---
  useEffect(() => {
    if (justLoggedIn) {
      notifySubscriptions(subscriptions);
      setJustLoggedIn(false);
    }
  }, [justLoggedIn]);

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
        subscriptions,
        setSubscriptions,
        addSubscription,
        settings,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
