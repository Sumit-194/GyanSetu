import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // connectivity check
      try {
        const pingRes = await fetch("/api/ping");
        if (!pingRes.ok) {
          setError("Server unreachable: /api/ping failed");
          setLoading(false);
          return;
        }
      } catch (e) {
        setError("Server unreachable: cannot reach /api/ping");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, username, password }),
      });
      let txt = null;
      try {
        if (!res.bodyUsed) {
          txt = await res.text();
        }
      } catch (e) {
        // if body already used or reading fails, leave txt null
        txt = null;
      }
      let data = null;
      try {
        data = txt ? JSON.parse(txt) : null;
      } catch (e) {
        data = null;
      }
      if (!res.ok) return setError((data && data.error) || `Signup failed (${res.status})`);
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.mongoUserId) localStorage.setItem("mongoUserId", data.mongoUserId);
      // Newly signed up users should complete profile (role/bio)
      navigate("/register", { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // connectivity check
      try {
        const pingRes = await fetch("/api/ping");
        if (!pingRes.ok) {
          setError("Server unreachable: /api/ping failed");
          setLoading(false);
          return;
        }
      } catch (e) {
        setError("Server unreachable: cannot reach /api/ping");
        setLoading(false);
        return;
      }

      const identifier = email || username;
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      let txt = null;
      try {
        if (!res.bodyUsed) {
          txt = await res.text();
        }
      } catch (e) {
        txt = null;
      }
      let data = null;
      try {
        data = txt ? JSON.parse(txt) : null;
      } catch (e) {
        data = null;
      }
      if (!res.ok) return setError((data && data.error) || `Signin failed (${res.status})`);
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.mongoUserId) localStorage.setItem("mongoUserId", data.mongoUserId);
      // If user has profile (server may include role in /me), redirect to home
      const me = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${data?.token || localStorage.getItem("token")}` } });
      let meTxt = null;
      try {
        if (!me.bodyUsed) {
          meTxt = await me.text();
        }
      } catch (e) {
        meTxt = null;
      }
      let meData = null;
      if (me.ok) {
        try {
          meData = meTxt ? JSON.parse(meTxt) : null;
        } catch (e) {
          meData = null;
        }
        const user = meData?.user;
        if (user?.role) {
          navigate("/", { replace: true });
        } else {
          navigate("/register", { replace: true });
        }
      } else {
        navigate("/register", { replace: true });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] container mx-auto px-4 py-10 grid place-items-center">
      <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-md">
        <h2 className="text-lg font-semibold">{mode === "signup" ? "Create account" : "Sign in"}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {mode === "signup" ? "Create an account to get started." : "Sign in to your account."}
        </p>

        {mode === "signup" ? (
          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
            <input required placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded border px-3 py-2" />
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" />
            <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
            <button disabled={loading} className="w-full rounded bg-indigo-600 text-white px-4 py-2">{loading ? "Signing up..." : "Continue"}</button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-sm">Already have an account? <Link to="/auth?mode=signin" className="text-indigo-600">Sign in</Link></p>
          </form>
        ) : (
          <form onSubmit={handleSignin} className="mt-6 space-y-4">
            <input placeholder="Email or Username" value={email} onChange={(e) => { setEmail(e.target.value); setUsername(""); }} className="w-full rounded border px-3 py-2" />
            <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
            <button disabled={loading} className="w-full rounded bg-indigo-600 text-white px-4 py-2">{loading ? "Signing in..." : "Sign in"}</button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-sm">Don't have an account? <Link to="/auth?mode=signup" className="text-indigo-600">Sign up</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
