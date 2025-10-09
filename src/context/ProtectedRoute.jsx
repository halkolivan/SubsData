import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function ProtectedRoute({ children }) {
  const { user, setIsAuthModalOpen } = useAuth();

  useEffect(() => {
    if (!user) setIsAuthModalOpen(true);
  }, [user, setIsAuthModalOpen]);

  if (!user) return null;

  return children;
}
