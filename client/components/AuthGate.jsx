import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthGate({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("mongoUserId");
          navigate("/auth", { replace: true });
          return;
        }
        const data = await res.json();
        const user = data?.user;
        if (!user) {
          localStorage.removeItem("token");
          navigate("/auth", { replace: true });
          return;
        }
        if (!user.role) {
          // preserve mongo id
          if (user._id) localStorage.setItem("mongoUserId", user._id);
          navigate("/register", { replace: true });
        } else {
          if (user._id) localStorage.setItem("mongoUserId", user._id);
        }
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("mongoUserId");
        navigate("/auth", { replace: true });
      }
    })();
  }, [navigate]);

  return children;
}
