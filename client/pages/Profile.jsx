import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function Profile() {
  const { userid } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequestId, setPendingRequestId] = useState(null);

  useEffect(() => {
    if (!userid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teachers/${userid}`);
        if (!res.ok) {
          setMessage("Unable to load profile");
          setTeacher(null);
        } else {
          const data = await res.json();
          setTeacher(data.teacher || null);
        }

        // fetch current user to see if teacher viewing student
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const meRes = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
            if (meRes.ok) {
              const meData = await meRes.json();
              setCurrentUser(meData.user);

              // if current user is teacher, check incoming requests for pending from this student
              if (meData.user && meData.user.role === "teacher") {
                const inc = await fetch("/api/requests/incoming", { headers: { Authorization: `Bearer ${token}` } });
                if (inc.ok) {
                  const incData = await inc.json();
                  const found = (incData.requests || []).find((r) => r.studentId && (r.studentId._id || r.studentId) === userid || (r.studentId && r.studentId._id && r.studentId._id.toString() === userid));
                  if (found) setPendingRequestId(found._id || found._id.toString());
                }
              }
            }
          } catch (e) {
            console.error("Unable to fetch current user", e);
          }
        }
      } catch (err) {
        console.error(err);
        setMessage("Unable to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [userid]);

  async function sendRequest() {
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth", { replace: true });
        return;
      }
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherId: userid }),
      });
      if (res.status === 201) {
        setMessage("Request sent");
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || "Unable to send request");
      }
    } catch (err) {
      console.error(err);
      setMessage("Unable to send request");
    }
  }

  async function acceptRequest() {
    if (!pendingRequestId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/requests/${pendingRequestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage("Request accepted");
        setPendingRequestId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || "Unable to accept request");
      }
    } catch (e) {
      console.error(e);
      setMessage("Unable to accept request");
    }
  }

  if (loading) return <div className="container mx-auto p-6">Loading profile...</div>;
  if (!teacher) return <div className="container mx-auto p-6">{message || "Profile not found"}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto rounded-md border p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
            {teacher.name ? teacher.name.charAt(0).toUpperCase() : "T"}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{teacher.name || teacher.username}</h1>
            <div className="text-sm text-muted-foreground">@{teacher.username}</div>
          </div>
          <div className="ml-auto">
            <button onClick={() => navigate(-1)} className="rounded-md border px-3 py-1 text-sm">Back</button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold">About</h3>
          <p className="mt-2 text-sm">{teacher.bio || "No bio provided."}</p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {currentUser && currentUser.role === "student" && (
            <>
              <button onClick={sendRequest} className="rounded-md bg-indigo-600 px-4 py-2 text-white">
                Teach me
              </button>
              {message && <div className="text-sm text-muted-foreground">{message}</div>}
            </>
          )}

          {currentUser && currentUser.role === "teacher" && (
            <>
              {pendingRequestId ? (
                <button onClick={acceptRequest} className="rounded-md bg-indigo-600 px-4 py-2 text-white">
                  Accept teach request
                </button>
              ) : (
                <div className="text-sm text-muted-foreground">{message || "No pending request from this student"}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
