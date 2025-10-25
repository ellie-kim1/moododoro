import React, { useEffect, useMemo, useRef, useState } from "react";
import logo1 from ".public/assets/logo1.png";
import logo2 from ".public/assets/logo2.png";

/**
 * Moododoro v2 — Auth + Pomodoro + Mood-to-Music Recommender
 * Demo auth (localStorage): Login / Register / Continue as Guest
 * NOTE: Plain-text passwords; for hackathon demo only.
 */

/* === Spotify OAuth (via your backend) === */
const SPOTIFY_CLIENT_ID = "59a1a68551ab4e0aa819450939ac3219";
const SPOTIFY_REDIRECT_URI = "https://moododoro-jyhdiz3wv-ellie-kim1s-projects.vercel.app/callback";
const SPOTIFY_SCOPES = ["user-read-private", "playlist-read-private"]; // server must add streaming scopes

const BACKEND_URL = "https://moododoro-jyhdiz3wv-ellie-kim1s-projects.vercel.app/api/spotify";
function connectSpotify() {
  window.location.href = `${BACKEND_URL}/login`;
}

/* ---------------------------- Utility ---------------------------- */
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------------------- Local Storage Helpers -------------------- */
const USERS_KEY = "moododoro_users";
const SESSION_KEY = "moododoro_session";

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

/* ---------------------- Playlists (no auth) ---------------------- */
/* ---------------------- Playlists (no auth) ---------------------- */
const PLAYLISTS = {
  energize: [
    { title: "Sunny Day (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX1BzILRveYHb?utm_source=generator" },
    { title: "Energetic Studying Mix (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1EIgh7xi8nPIv9" },
    { title: "Upbeat Studying (Spotify Tasha Drolet)", url: "https://open.spotify.com/embed/playlist/6qQU5fK0BRXxIuFeKWYgRX?utm_source=generator" },
    { title: "Intense locked in motiational studying (Spotify)", url: "https://open.spotify.com/embed/playlist/2UKa44eOG5ZDiRoremIkeE?utm_source=generator" },
  ],
  calm_down: [
    { title: "Lo-Fi Beats (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DXd9rSDyQguIk" },
    { title: "Peaceful Piano (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO" },
    { title: "Study, chill, vibe, r&b (Spotify)", url: "https://open.spotify.com/embed/playlist/00vJgCqGYCVGjC3NJO7Jn0?utm_source=generator" },
    { title: "Ambient Relaxation (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX3Ogo9pFvBkY" },
  ],
  uplift: [
    { title: "Feel-Good Indie (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL" },
    { title: "Happy Hits! (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC" },
    { title: "Good Vibes (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWYBO1MoTDhZI?utm_source=generator" },
    { title: "Uplifting Music 2025 (Spotify)", url: "https://open.spotify.com/embed/playlist/3a8ssl2IKbhSmEzzIPYvbC?utm_source=generator" },
  ],
  steady_focus: [
    { title: "Deep Focus (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS" },
    { title: "Coding Mode (Spotify)", url: "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM" },
    { title: "Focus Flow (Spotify)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZZbwlv3Vmtr?utm_source=generator" },
    { title: "Deep Focus (Spotify)", url: "https://open.spotihttps://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generatorfy.com/embed/playlist/37i9dQZF1DX5Ejj0EkURtP" },
  ],
};

/* -------------------- Recommendation Heuristics ------------------ */
function pickCategory(energy, valence) {
  if (valence < -10) return "uplift";
  if (valence > 20 && energy > 70) return "steady_focus";
  if (energy < 30) return "energize";
  if (energy > 75) return "calm_down";
  return "steady_focus";
}
function pickPlaylist(category) {
  const list = PLAYLISTS[category] ?? PLAYLISTS.steady_focus;
  return list[Math.floor(Math.random() * list.length)];
}

/* ------------------------- Beep (base64) ------------------------- */
const BEEP = typeof window !== "undefined"
  ? new Audio("data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAEsAAACaGFkYWFhYWFhYWFhYWFhYWFhYQ==")
  : null;

/* -------------------------- Auth Gate ---------------------------- */
function AuthGate({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register | guest
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setError(""); }, [mode]);

  const submit = (e) => {
    e.preventDefault();
    const users = loadUsers();

    if (mode === "register") {
      if (!name.trim()) return setError("Please enter your name");
      if (!email.includes("@")) return setError("Please enter a valid email");
      if (password.length < 4) return setError("Password must be 4+ characters");
      if (users[email]) return setError("An account already exists for this email");

      users[email] = { name: name.trim(), email, password };
      saveUsers(users);
      const session = { name: name.trim(), email };
      saveSession(session);
      onAuthed(session);
      return;
    }

    if (mode === "login") {
      if (!users[email]) return setError("No account found for this email");
      if (users[email].password !== password) return setError("Incorrect password");

      const session = { name: users[email].name, email };
      saveSession(session);
      onAuthed(session);
      return;
    }
  };

  const continueAsGuest = () => {
    const guestName = name.trim() || "Guest";
       const session = { name: guestName, email: null };
       saveSession(session);
       onAuthed(session);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-6 border border-slate-800">
        <h1 className="text-2xl font-semibold tracking-tight text-center">Moododoro</h1>
        <p className="text-sm text-slate-400 text-center mt-1">Focus timer + mood-aware music</p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { key: "login", label: "Log in" },
            { key: "register", label: "Register" },
            { key: "guest", label: "Guest" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={
                "py-2 rounded-xl text-sm border transition " +
                (mode === t.key ? "bg-sky-600 border-sky-500" : "border-slate-700 hover:border-slate-600")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode !== "guest" ? (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            {mode === "register" && (
              <label className="grid gap-1 text-sm">
                <span className="text-slate-300">Name</span>
                <input value={name} onChange={(e)=>setName(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 outline-none" placeholder="Jane Doe" />
              </label>
            )}
            <label className="grid gap-1 text-sm">
              <span className="text-slate-300">Email</span>
              <input value={email} onChange={(e)=>setEmail(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 outline-none" placeholder="you@email.com" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-300">Password</span>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 outline-none" placeholder="••••" />
            </label>

            {error && <div className="text-rose-400 text-xs">{error}</div>}

            <button type="submit" className="mt-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 transition shadow">
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        ) : (
          <div className="mt-6 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-slate-300">Display name (optional)</span>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 outline-none" placeholder="Guest" />
            </label>
            <button onClick={continueAsGuest} className="mt-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 transition shadow">
              Continue as guest
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-500 mt-6 text-center">Demo auth only • Data stored locally in your browser</p>
      </div>
    </div>
  );
}

/* -------------------------- App Wrapper -------------------------- */
export default function App() {
  const [session, setSession] = useState(() => loadSession());
  if (!session) return <AuthGate onAuthed={setSession} />;
  return <MainApp session={session} onLogout={() => { localStorage.removeItem("spotify_token"); clearSession(); setSession(null); }} />;
}

/* -------------------------- Main App (UI) ------------------------ */
function MainApp({ session, onLogout }) {
  // --- Spotify user display (unchanged) ---
  const [spotifyUser, setSpotifyUser] = useState(null);

  useEffect(() => {
    const setFromToken = async (token) => {
      try {
        const res = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok || data?.error) {
          localStorage.removeItem("spotify_token");
          setSpotifyUser(null);
          return;
        }
        setSpotifyUser(data);
      } catch {
        localStorage.removeItem("spotify_token");
        setSpotifyUser(null);
      }
    };

    const raw = window.location.hash;
    if (raw) {
      const hash = new URLSearchParams(raw.replace(/^#/, ""));
      const err = hash.get("error");
      const tok = hash.get("access_token");
      if (err) {
        console.warn("Spotify OAuth error:", err);
        alert(`Spotify sign-in error: ${err}`);
        window.location.hash = "";
        return;
      }
      if (tok) {
        localStorage.setItem("spotify_token", tok);
        window.location.hash = "";
        setFromToken(tok);
        return;
      }
    }

    const stored = localStorage.getItem("spotify_token");
    if (stored) setFromToken(stored);
  }, []);

  /* ==== Web Playback SDK (ADDED – minimal) ==== */
  const [deviceId, setDeviceId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const playerRef = useRef(null);

  // Check Premium entitlement
  useEffect(() => {
    const token = localStorage.getItem("spotify_token");
    if (!token) return;
    fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setIsPremium(d?.product === "premium"))
      .catch(() => setIsPremium(false));
  }, []);

  // Convert embed URL → context_uri
  function playlistUrlToUri(embedUrl) {
    const m = embedUrl?.match(/playlist\/([A-Za-z0-9]+)/);
    return m ? `spotify:playlist:${m[1]}` : null;
  }

  // Move playback to our web player
  async function transferPlaybackHere(devId) {
    const token = localStorage.getItem("spotify_token");
    if (!token || !devId) return;
    const r = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ device_ids: [devId], play: false }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("[transferPlaybackHere] failed:", r.status, txt);
      alert("Could not transfer playback. Reconnect Spotify to refresh scopes.");
    }
  }

  function loadSpotifySDK() {
    return new Promise((resolve) => {
      if (window.Spotify && window.Spotify.Player) return resolve("ready");
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.onload = () => resolve("loaded");
      document.body.appendChild(script);
    });
  }

  function createPlayerWithToken(token) {
    const build = () => {
      const player = new window.Spotify.Player({
        name: "Moododoro Player",
        getOAuthToken: (cb) => cb(token),
        volume: 0.8,
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("[SDK] ready, device_id:", device_id);
        playerRef.current = player;
        setDeviceId(device_id);
        setPlayerReady(true);
      });
      player.addListener("not_ready", ({ device_id }) => {
        console.warn("[SDK] not_ready", device_id);
        setPlayerReady(false);
      });
      player.addListener("initialization_error", ({ message }) => {
        console.error("[SDK] initialization_error:", message);
        alert("Spotify init error: " + message);
      });
      player.addListener("authentication_error", ({ message }) => {
        console.error("[SDK] authentication_error:", message);
        alert("Spotify auth error (token/scopes): " + message);
      });
      player.addListener("account_error", ({ message }) => {
        console.error("[SDK] account_error:", message);
        alert("Spotify account error (Premium required): " + message);
      });

      player.connect();
      return player;
    };

    if (window.Spotify && window.Spotify.Player) return build();
    window.onSpotifyWebPlaybackSDKReady = () => build();
    return null;
  }

  async function initSpotifyPlayer() {
    const token = localStorage.getItem("spotify_token");
    if (!token) { alert("Connect Spotify first."); throw new Error("no_token"); }

    await loadSpotifySDK();
    const maybePlayer = createPlayerWithToken(token);

    try { await playerRef.current?.activateElement?.(); } catch {}
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (playerReady && deviceId) { clearInterval(t); resolve(deviceId); }
      }, 100);
      if (maybePlayer) playerRef.current = maybePlayer;
    });
  }

  async function playContextUri(context_uri) {
    const token = localStorage.getItem("spotify_token");
    if (!token || !deviceId) return;
    try { await playerRef.current?.activateElement?.(); } catch {}

    const r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ context_uri }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("[playContextUri] failed:", r.status, txt);
      alert("Play failed. Ensure Premium + streaming scopes + accessible playlist.");
    }
  }

  // ---------------- Timer + Mood (unchanged) ----------------
  const [workMin, setWorkMin] = useState(25);
  const [shortBreakMin, setShortBreakMin] = useState(5);
  const [longBreakMin, setLongBreakMin] = useState(15);
  const [cyclesBeforeLong, setCyclesBeforeLong] = useState(4);

  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("work"); // work | short | long
  const [cycleCount, setCycleCount] = useState(0);

  const [energy, setEnergy] = useState(50);
  const [valence, setValence] = useState(10);
  const [currentCategory, setCurrentCategory] = useState(() => pickCategory(50, 10));
  const [currentPlaylist, setCurrentPlaylist] = useState(() => pickPlaylist(currentCategory));

  const tickRef = useRef(null);

  useEffect(() => {
    const mm = pad(Math.floor(secondsLeft / 60));
    const ss = pad(secondsLeft % 60);
    const icon = phase === "work" ? "🧠" : phase === "short" ? "☕" : "🌿";
    document.title = `${icon} ${mm}:${ss} • moododoro ${logo2}`;
  }, [secondsLeft, phase]);

  useEffect(() => {
    if (phase === "work") setSecondsLeft(workMin * 60);
    if (phase === "short") setSecondsLeft(shortBreakMin * 60);
    if (phase === "long") setSecondsLeft(longBreakMin * 60);
  }, [workMin, shortBreakMin, longBreakMin, phase]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          BEEP && BEEP.play().catch(() => {});
          if (phase === "work") {
            const nextCycle = cycleCount + 1;
            const doLong = nextCycle % cyclesBeforeLong === 0;
            setPhase(doLong ? "long" : "short");
            setCycleCount(nextCycle);
          } else {
            setPhase("work");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, phase, cycleCount, cyclesBeforeLong]);

  useEffect(() => { setCurrentCategory(pickCategory(energy, valence)); }, [energy, valence]);
  useEffect(() => { setCurrentPlaylist(pickPlaylist(currentCategory)); }, [currentCategory]);

  const progress = useMemo(() => {
    const total = phase === "work" ? workMin * 60 : phase === "short" ? shortBreakMin * 60 : longBreakMin * 60;
    return 100 * (1 - secondsLeft / total);
  }, [secondsLeft, phase, workMin, shortBreakMin, longBreakMin]);

  const nextSession = () => {
    setRunning(false);
    if (phase === "work") {
      const nextCycle = cycleCount + 1;
      const doLong = nextCycle % cyclesBeforeLong === 0;
      setPhase(doLong ? "long" : "short");
      setCycleCount(nextCycle);
    } else {
      setPhase("work");
    }
  };

  const resetTimer = () => {
    setRunning(false);
    setPhase("work");
    setCycleCount(0);
    setSecondsLeft(workMin * 60);
  };

  const mm = pad(Math.floor(secondsLeft / 60));
  const ss = pad(secondsLeft % 60);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-2">
        {/* Timer Card */}
        <div className="bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-6 border border-slate-800">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">moododoro ${logo1}</h1>
              <div className="text-sm text-slate-400">
                Hi, <span className="text-slate-200 font-medium">{session?.name || "Guest"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Spotify web player controls (ADDED) */}
              {isPremium ? (
                <>
                </>
              ) : (
                <span className="text-xs text-slate-400" title="Spotify Premium required for full playback">
                  Premium required for full songs
                </span>
              )}

              {spotifyUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">🎵 {spotifyUser.display_name}</span>
                  <button
                    onClick={() => { localStorage.removeItem("spotify_token"); setSpotifyUser(null); }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button onClick={connectSpotify} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs">
                  Connect Spotify
                </button>
              )}

              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="mt-6">
            <div className="text-7xl font-bold tabular-nums tracking-tight text-center">
              {mm}:{ss}
            </div>
            <div className="mt-4 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Phase: <b className="text-slate-200">{phase}</b></span>
              <span>Cycles: <b className="text-slate-200">{cycleCount}</b> · Long every {cyclesBeforeLong}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setRunning((r) => !r)} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 transition shadow">
                {running ? "Pause" : "Start"}
              </button>
              <button onClick={resetTimer} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700">
                Reset
              </button>
              <button onClick={nextSession} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700">
                Next Session
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Setting label="Work (min)" value={workMin} setValue={setWorkMin} min={5} max={60} />
            <Setting label="Short Break (min)" value={shortBreakMin} setValue={setShortBreakMin} min={3} max={20} />
            <Setting label="Long Break (min)" value={longBreakMin} setValue={setLongBreakMin} min={10} max={45} />
            <Setting label="Cycles before long" value={cyclesBeforeLong} setValue={setCyclesBeforeLong} min={2} max={8} />
          </div>
        </div>

        {/* Mood + Music Card */}
        <div className="bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold tracking-tight">Personalized Mood-to-Music 🎧</h2>
          <p className="text-sm text-slate-400 mt-1">Tell me how you feel; I’ll steer the vibe toward optimal study focus.</p>

          {/* Mood sliders */}
          <div className="mt-6 grid gap-6">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Energy</span>
                <span className="text-slate-400">{energy}</span>
              </div>
              <input type="range" min={0} max={100} value={energy} onChange={(e) => setEnergy(parseInt(e.target.value, 10))} className="w-full accent-sky-500" />
              <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Low</span><span>High</span></div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Valence</span>
                <span className="text-slate-400">{valence}</span>
              </div>
              <input type="range" min={-50} max={50} value={valence} onChange={(e) => setValence(parseInt(e.target.value, 10))} className="w-full accent-sky-500" />
              <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Sad</span><span>Happy</span></div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Suggested category</div>
                <div className="text-lg font-semibold capitalize">{currentCategory.replace("_", " ")}</div>
              </div>
              <button onClick={() => setCurrentPlaylist(pickPlaylist(currentCategory))} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm">
                Shuffle playlist
              </button>
            </div>

            <div className="mt-4 rounded-xl overflow-hidden border border-slate-800">
              <iframe
                title={currentPlaylist?.title || "playlist"}
                className="w-full h-72"
                src={currentPlaylist?.url}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
            <div className="mt-2 text-sm text-slate-300">{currentPlaylist?.title}</div>
          </div>

        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 text-center text-xs text-slate-500">
        moododoro ${logo1} ${logo2}
      </div>
    </div>
  );
}

function Setting({ label, value, setValue, min, max }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <label className="text-slate-300">{label}</label>
        <span className="text-slate-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(clamp(parseInt(e.target.value, 10), min, max))}
        className="w-full accent-sky-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}