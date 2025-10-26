// pages/api/spotify/login.js
export default function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const scope = "user-read-private playlist-read-private";

  const params = new URLSearchParams({
    client_id,
    response_type: "token",
    redirect_uri,
    scope,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}