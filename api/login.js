// /api/login  -> redirect to Spotify authorize
export default async function handler(req, res) {
    const scopes = [
      "playlist-read-private",
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
    ].join(" ");
  
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI; // e.g., https://moododo.work/api/callback
    const clientId = process.env.SPOTIFY_CLIENT_ID;
  
    const state = "moododoro_" + Math.random().toString(36).slice(2);
  
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      show_dialog: "true",
    });
  
    res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
  }  