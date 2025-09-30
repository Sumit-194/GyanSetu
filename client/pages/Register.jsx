import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("mongoUserId");
          navigate("/auth", { replace: true });
          return;
        }
        const data = await res.json();
        const user = data?.user;
        if (user?.role) {
          if (user._id) localStorage.setItem("mongoUserId", user._id);
          navigate("/", { replace: true });
        } else if (user?._id) {
          localStorage.setItem("mongoUserId", user._id);
        }
      } catch (err) {
        // proceed to allow manual submit
      }
    })();
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let avatarUrl = "";
      if (avatarFile) {
        // Avatar upload can be wired to Cloudinary later via signed uploads
        // For now, skip upload and proceed without avatarUrl
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Missing auth token. Please sign in.");
        setLoading(false);
        return;
      }

      const payload = { role, bio, avatarUrl };

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.mongoUserId) {
          localStorage.setItem("mongoUserId", data.mongoUserId);
          setMessage("Registration complete. You're all set!");
          navigate("/", { replace: true });
        } else {
          setMessage("Unexpected response from server");
        }
      } else {
        setMessage("Server rejected the profile update");
      }
    } catch (err) {
      setMessage("Unable to save. Check your network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Get started</h1>
        <p className="text-muted-foreground mt-1">
          Complete your profile to access the app.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <div className="flex items-center gap-3">
              <label className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${role === "student" ? "ring-2 ring-indigo-400" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                />
                <span>Student</span>
              </label>
              <label className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${role === "teacher" ? "ring-2 ring-indigo-400" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={role === "teacher"}
                  onChange={() => setRole("teacher")}
                />
                <span>Teacher</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Profile bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Tell others about your goals or expertise"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Avatar (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:brightness-110"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save and continue"}
          </button>

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
