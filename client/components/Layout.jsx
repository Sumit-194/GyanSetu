import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <a
      href={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "text-primary-foreground bg-primary/90"
          : "text-foreground/80 hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </a>
  );
}

function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 15000);
    return () => clearInterval(iv);
  }, []);

  async function fetchNotifications() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error("fetchNotifications", e);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.error("markRead", e);
    }
  }

  function handleAction(n) {
    markRead(n._id);
    setOpen(false);
    try {
      if (n.type === "request_received") {
        const sid = n.payload && n.payload.studentId;
        if (sid) navigate(`/profile/${sid}`);
      } else if (n.type === "request_accepted") {
        const tid = n.payload && n.payload.teacherId;
        if (tid) navigate(`/profile/${tid}`);
      } else if (n.type === "group_added" || n.type === "video_uploaded") {
        navigate(`/`);
        if (n.type === "video_uploaded") {
          const info = n.payload && n.payload.video;
          if (info && info.title) toast(`${info.title} uploaded to ${n.payload.groupName}`);
        } else if (n.type === "group_added") {
          toast(`You were added to group ${n.payload.groupName}`);
        }
      } else {
        navigate(`/`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="h-9 w-9 rounded-md flex items-center justify-center bg-muted/60">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-md shadow-lg z-50 p-2">
          <div className="font-semibold px-2 py-1">Notifications</div>
          <div className="max-h-64 overflow-auto">
            {loading && <div className="p-2 text-sm text-muted-foreground">Loading...</div>}
            {!loading && notifications.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">No notifications</div>
            )}
            {!loading && notifications.map((n) => (
              <div key={n._id} className={`p-2 border-b last:border-b-0 cursor-pointer ${n.read ? 'bg-white' : 'bg-slate-50'}`} onClick={() => handleAction(n)}>
                <div className="text-sm font-medium">{n.type.replace('_', ' ')}</div>
                <div className="text-xs text-muted-foreground">{n.payload && (n.payload.groupName || n.payload.studentId || n.payload.teacherId || '')}</div>
              </div>
            ))}
          </div>
          <div className="text-right mt-2">
            <button onClick={() => { setOpen(false); }} className="text-sm text-muted-foreground">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const hideNav = typeof location?.pathname === 'string' && (location.pathname.startsWith('/auth') || location.pathname.startsWith('/register'));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/70">
      {!hideNav && (
        <header
          className={`sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
            scrolled ? "border-b" : ""
          }`}
        >
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500" />
              <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                GyanSetu
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/">Home</NavLink>
            </nav>
            <div className="flex items-center gap-2">
              <NotificationsButton />
              {localStorage.getItem("token") ? (
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem("token");
                      localStorage.removeItem("mongoUserId");
                    } catch (e) {}
                    navigate('/auth', { replace: true });
                  }}
                  className="hidden md:inline-flex h-9 items-center rounded-md bg-gradient-to-r from-red-600 to-pink-500 px-4 text-sm font-semibold text-white shadow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Logout
                </button>
              ) : (
                <a
                  href="/auth"
                  className="hidden md:inline-flex h-9 items-center rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  Get started
                </a>
              )}
            </div>
          </div>
        </header>
      )}

      <main>{children}</main>

      {!hideNav && (
        <footer className="border-t mt-16">
          <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} GyanSetu</p>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-foreground">Home</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
