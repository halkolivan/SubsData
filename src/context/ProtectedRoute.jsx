import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, setIsAuthModalOpen } = useAuth();

  if (!user) {
    setIsAuthModalOpen(true); // открываем модалку
    return null; // пока ничего не рендерим
  }

  return children;
}
