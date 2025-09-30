
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Small helper components placed inline for Index page
function MenteesList({ incoming, onOpenProfile }) {
  const accepted = (incoming || []).filter((r) => r.status === "accepted").map((r) => r.studentId).filter(Boolean);
  if (!accepted || accepted.length === 0) return <div className="text-sm text-muted-foreground">No mentees yet</div>;
  return (
    <div className="grid gap-3">
      {accepted.map((s) => (
        <div key={s._id || s} className="rounded-md border p-3 flex items-start justify-between">
          <div>
            <div className="font-semibold">{s.name || s.username}</div>
            <div className="text-sm text-muted-foreground">@{s.username}</div>
            <div className="mt-2 text-sm">{s.bio}</div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => onOpenProfile(s._id || s)} className="rounded-md border px-3 py-1 text-sm">
              View profile
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupsManager({ user, incoming, onGroupCreated }) {
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoFileData, setVideoFileData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [groupMessage, setGroupMessage] = useState("");

  const acceptedStudents = (incoming || []).filter((r) => r.status === "accepted").map((r) => r.studentId).filter(Boolean);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  async function fetchGroups() {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const res = await fetch(`/api/groups?teacherId=${user._id}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error("fetchGroups", e);
    } finally {
      setLoadingGroups(false);
    }
  }

  function toggleSelectStudent(id) {
    setSelectedStudentIds((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      return [...s, id];
    });
  }

  async function createGroup() {
    if (!groupName.trim()) return setGroupMessage("Please enter a group name");
    if (!user) return setGroupMessage("User not loaded");
    setCreatingGroup(true);
    setGroupMessage("");
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, teacherId: user._id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGroupMessage(err.error || 'Unable to create group');
        return;
      }
      const data = await res.json();
      const groupId = data.groupId || (data.group && data.group._id);
      if (selectedStudentIds.length > 0) {
        await fetch(`/api/groups/${groupId}/add-students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: selectedStudentIds }),
        });
      }
      setGroupName('');
      setSelectedStudentIds([]);
      setGroupMessage('Group created');
      fetchGroups();
      if (onGroupCreated) onGroupCreated();
    } catch (e) {
      console.error('createGroup', e);
      setGroupMessage('Unable to create group');
    } finally {
      setCreatingGroup(false);
    }
  }

  async function openGroup(g) {
    setSelectedGroup(g);
  }

  function handleFileChange(file) {
    if (!file) {
      setVideoFileData(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setVideoFileData(dataUrl);
    };
    reader.onerror = (e) => {
      console.error('file read error', e);
      setGroupMessage('Unable to read file');
    };
    reader.readAsDataURL(file);
  }

  async function uploadVideo() {
    if (!selectedGroup) return setGroupMessage('Select a group');
    if (!videoUrl && !videoFileData) return setGroupMessage('Provide a video file or URL');
    setGroupMessage('');
    setUploading(true);
    try {
      const body = videoFileData
        ? { fileData: videoFileData, title: videoTitle }
        : { fileUrl: videoUrl, title: videoTitle };

      const res = await fetch(`/api/groups/${selectedGroup._id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGroupMessage(err.error || 'Upload failed');
        return;
      }
      const data = await res.json();
      setVideoUrl('');
      setVideoTitle('');
      setVideoFileData(null);
      setGroupMessage('Video uploaded');
      fetchGroups();
      // refresh selected group with updated videos
      if (data && data.video) {
        setSelectedGroup((prev) => ({ ...(prev || {}), videos: [...((prev && prev.videos) || []), data.video] }));
      }
    } catch (e) {
      console.error('uploadVideo', e);
      setGroupMessage('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="rounded-md border p-4 mb-4">
        <h3 className="font-semibold mb-2">Create group</h3>
        <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="w-full rounded border px-3 py-2 mb-2" />
        <div className="mb-2 text-sm text-muted-foreground">Select students to add</div>
        <div className="grid gap-2 mb-2">
          {acceptedStudents.length === 0 && <div className="text-sm text-muted-foreground">No accepted students to add</div>}
          {acceptedStudents.map((s) => (
            <label key={s._id || s} className="flex items-center gap-2">
              <input type="checkbox" checked={selectedStudentIds.includes(s._id || s)} onChange={() => toggleSelectStudent(s._id || s)} />
              <div className="text-sm">{s.name || s.username} <span className="text-muted-foreground">@{s.username}</span></div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={createGroup} disabled={creatingGroup} className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white">
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </button>
          {groupMessage && <div className="text-sm text-muted-foreground">{groupMessage}</div>}
        </div>
      </div>

      <div className="rounded-md border p-4">
        <h3 className="font-semibold mb-2">Your groups</h3>
        {loadingGroups ? (
          <div className="text-sm text-muted-foreground">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-sm text-muted-foreground">No groups yet</div>
        ) : (
          <div className="grid gap-3">
            {groups.map((g) => (
              <div key={g._id} className="rounded-md border p-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-sm text-muted-foreground">{(g.studentIds || []).length} students</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => openGroup(g)} className="rounded-md border px-3 py-1 text-sm">Open</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedGroup && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-semibold">Group: {selectedGroup.name}</h4>
            <div className="text-sm text-muted-foreground mb-2">Students: {(selectedGroup.studentIds || []).map(s=>s.name||s.username).join(', ')}</div>
            <div className="mb-2">
              <input value={videoTitle} onChange={(e)=>setVideoTitle(e.target.value)} placeholder="Video title (optional)" className="w-full rounded border px-3 py-2 mb-2" />

              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">Upload video file</label>
                <input type="file" accept="video/*" onChange={(e) => handleFileChange(e.target.files && e.target.files[0])} className="w-full" />
                <div className="text-xs text-muted-foreground mt-1">Or provide a remote video URL below</div>
              </div>

              <input value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} placeholder="Remote video URL (Cloudinary will fetch)" className="w-full rounded border px-3 py-2 mb-2" />
              <div className="flex items-center gap-2">
                <button onClick={uploadVideo} disabled={uploading} className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white">{uploading ? 'Uploading...' : 'Upload Video'}</button>
                {groupMessage && <div className="text-sm text-muted-foreground">{groupMessage}</div>}
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-2">Videos</h5>
              {(!selectedGroup.videos || selectedGroup.videos.length === 0) && <div className="text-sm text-muted-foreground">No videos yet</div>}
              {(selectedGroup.videos || []).map((v) => (
                <div key={v.publicId || v.url} className="mb-2">
                  <div className="font-semibold">{v.title || 'Untitled'}</div>
                  <a className="text-sm text-indigo-600" href={v.url} target="_blank" rel="noreferrer">Open video</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Student search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  // Teacher incoming requests
  const [incoming, setIncoming] = useState([]);
  const [refreshToggle, setRefreshToggle] = useState(false);

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
        setUser(data.user);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        localStorage.removeItem("mongoUserId");
        navigate("/auth", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, refreshToggle]);

  useEffect(() => {
    if (user && user.role === "teacher") {
      (async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("/api/requests/incoming", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setIncoming(data.requests || []);
          }
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [user, refreshToggle]);

  async function doSearch(e) {
    e && e.preventDefault();
    setMessage("");
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/teachers/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setMessage("Search failed");
        setResults([]);
      } else {
        const data = await res.json();
        setResults(data.teachers || []);
      }
    } catch (err) {
      console.error(err);
      const msg = err && err.name === "TypeError" ? "Network error. Please try again." : "Unable to search";
      setMessage(msg);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function openTeacher(id) {
    navigate(`/profile/${id}`);
  }

  async function sendRequest(teacherId) {
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
        body: JSON.stringify({ teacherId }),
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

  async function acceptRequest(requestId) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/requests/${requestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRefreshToggle((s) => !s);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="container mx-auto p-6">Loading...</div>;

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, {user.name || user.username}</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Role: {user.role}</div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("token");
                localStorage.removeItem("mongoUserId");
              } catch (e) {}
              navigate('/auth', { replace: true });
            }}
            className="rounded-md bg-red-600 px-3 py-1 text-sm text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {user.role === "student" ? (
        <div>
          <form onSubmit={doSearch} className="mb-4 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teachers by name, username or bio"
              className="flex-1 rounded-md border px-3 py-2"
            />
            <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-white">
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {message && <p className="mb-4 text-sm text-red-600">{message}</p>}

          <div className="grid gap-3">
            {results.map((t) => (
              <div key={t._id} className="rounded-md border p-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.name || t.username}</div>
                  <div className="text-sm text-muted-foreground">@{t.username}</div>
                  <div className="mt-2 text-sm">{t.bio}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => openTeacher(t._id)} className="rounded-md border px-3 py-1 text-sm">
                    View profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Mentees (accepted students) */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">My mentees</h2>
            <MenteesList incoming={incoming} onOpenProfile={openTeacher} />
          </div>

          {/* Group creation and management */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Groups</h2>
            <GroupsManager
              user={user}
              incoming={incoming}
              onGroupCreated={() => {
                // refresh groups by toggling refreshToggle
                setRefreshToggle((s) => !s);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
