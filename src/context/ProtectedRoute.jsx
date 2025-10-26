import { useEffect } from "react";
import { useAuth } from "@/context/auth-context-export";

export default function ProtectedRoute({ children }) {
  const { user, setIsAuthModalOpen } = useAuth();

  useEffect(() => {
    if (!user) setIsAuthModalOpen(true);
  }, [user, setIsAuthModalOpen]);

  if (!user) return null;

  return children;
}
