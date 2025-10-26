import { createContext, useContext } from "react";

// 1. Экспортируем сам контекст
export const AuthContext = createContext();

// 2. Экспортируем хук-потребитель
export const useAuth = () => {
  // В этом файле нет компонента, поэтому Fast Refresh не ругается
  return useContext(AuthContext);
};
