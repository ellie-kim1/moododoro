// server.js (ESM)
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// --- Force dotenv to load .env next to this file ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env");
dotenv.config({ path: envPath });

// Debug: show where we loaded from and what we got (no secrets printed)
console.log("Loaded .env from:", envPath);

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI, // e.g. http://127.0.0.1:5174/callback
  FRONTEND_URI,         // e.g. http://127.0.0.1:5173
  PORT = 5174,
} = process.env;

console.log({
  SPOTIFY_CLIENT_ID: !!SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URI,
});

// Helpful check
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI || !FRONTEND_URI) {
  console.error("[ENV ERROR] Missing one or more env vars. Check your .env file.");
  console.error("Expected keys: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, FRONTEND_URI");
}

const app = express();
app.use(cors());

// Step 1: Send user to Spotify Auth (Authorization Code flow)
/*
app.get("/login", (_req, res) => {
  const scope = ["user-read-private", "playlist-read-private"].join(" ");
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope,
    state: "moododoro-local",
    show_dialog: "true",
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});
*/

// server.js
app.get("/login", (_req, res) => {
  const scope = [
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-private",
    "playlist-read-private",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope,
    state: "moododoro-local",
    show_dialog: "true",
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Step 2: Spotify redirects back here with ?code=...
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) return res.redirect(`${FRONTEND_URI}/#error=${encodeURIComponent(error)}`);
  if (!code)  return res.redirect(`${FRONTEND_URI}/#error=missing_code`);

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || tokens.error) {
      return res.redirect(`${FRONTEND_URI}/#error=${encodeURIComponent(tokens.error || "token_exchange_failed")}`);
    }

    const hash = new URLSearchParams({
      access_token: tokens.access_token,
      token_type: tokens.token_type || "Bearer",
      expires_in: String(tokens.expires_in || 3600),
    }).toString();

    return res.redirect(`${FRONTEND_URI}/#${hash}`);
  } catch (e) {
    console.error(e);
    return res.redirect(`${FRONTEND_URI}/#error=exception`);
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Spotify auth server on http://127.0.0.1:${PORT}`);
});
