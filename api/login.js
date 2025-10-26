export default function handler(req, res) {
    const scopes = [
      "playlist-read-private",
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
    ].join(" ");
  
    const p = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI, // <— fixed
      scope: scopes,
      state: "moododoro_" + Math.random().toString(36).slice(2),
      show_dialog: "true",
    });
  
    res.redirect("https://accounts.spotify.com/authorize?" + p.toString());
  }