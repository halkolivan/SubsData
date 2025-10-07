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

  // при загрузке страницы пробуем декодировать токен и установить user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", jwt);
    setIsAuthModalOpen(false); // закрыть модалку входа
    setIsAddModalOpen(false); // закрыть модалку добавления
    setJustLoggedIn(true);
    notifySubscriptions(mockSubs);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
