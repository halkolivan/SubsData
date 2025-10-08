import { subscriptions as mockSubs } from "@mock/mockData";
import { notifySubscriptions } from "@/hooks/useNotifyDataSub";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || null
  );

  // Подписки — инициализируем из localStorage
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem("subscriptions");
    return saved ? JSON.parse(saved) : [];
  });

  // Сохраняем подписки при изменении
  useEffect(() => {
    localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
  }, [subscriptions]);

  // модалка входа (SignIn)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // модалка добавления подписки (AddSubscription)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // функция загрузки моков
  const loadMockSubscriptions = () => {
    setSubscriptions(mockSubs);
  };

  // Добавление новой подписки
  const addSubscription = (newSub) => {
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

    setSubscriptions((prev) => [...prev, subToAdd]);
  };

  // при загрузке страницы пробуем декодировать токен и установить user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  //Setting user
  // в начале файла, рядом с mockSubs
  const defaultSettings = {
    notif: {
      enabled: true,
      time: "09:00",
      frequency: "daily", // daily | weekdays | weekly
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

  // state (инициализируем из localStorage если есть)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // сохраняем при изменении
  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  // удобный апдейтер: принимает "патч" (можно обновлять вложенные разделы)
  const updateSettings = (patch) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      // аккуратно мёрджим вложенные объекты, если они переданы в патче
      notif: { ...(prev.notif || {}), ...(patch.notif || {}) },
      currency: { ...(prev.currency || {}), ...(patch.currency || {}) },
    }));
  };

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", jwt);
    setIsAuthModalOpen(false); // закрыть модалку входа
    setIsAddModalOpen(false); // закрыть модалку добавления
    setJustLoggedIn(true);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  };

  // вызывать уведомление только один раз при входе
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

export const useAuth = () => useContext(AuthContext);
