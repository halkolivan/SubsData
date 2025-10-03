// src/context/AuthContext.jsx
import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useState, useEffect } from "react";
import { subscriptions as mockSubscriptions } from "@mock/mockData";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);

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

  // функция загрузки моков
  const loadMockSubscriptions = () => {
    setSubscriptions(mockSubscriptions);
  };

  // при загрузке страницы пробуем декодировать токен и установить user
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ name: decoded.name, email: decoded.email });
      } catch (err) {
        console.error("Ошибка при декодировании токена:", err);
        localStorage.removeItem("authToken");
        setToken(null);
      }
    }
  }, [token]);

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem("authToken", jwt);
    setIsAuthModalOpen(false); // закрыть модалку входа
    setIsAddModalOpen(false); // закрыть модалку добавления
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
  };

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
