import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthGuard({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const mongoId = typeof window !== "undefined" && localStorage.getItem("mongoUserId");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    if (token && !mongoId) {
      navigate("/register", { replace: true });
      return;
    }
  }, [navigate]);

  return children;
}
