// /api/callback -> exchange code for tokens -> redirect back to frontend with token in hash
export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Missing code");
    }
  
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI; // must EXACTLY match Spotify Dashboard
    const frontendUri = process.env.FRONTEND_URI || "https://moododo.work";
  
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
  
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body,
    });
  
    const data = await tokenRes.json();
  
    if (!tokenRes.ok) {
      console.error("Spotify token error:", data);
      return res.status(500).send("Token exchange failed");
    }
  
    // Send tokens back to the frontend via URL hash (matches your current client parsing)
    const hash = new URLSearchParams({
      access_token: data.access_token || "",
      refresh_token: data.refresh_token || "",
      expires_in: String(data.expires_in || 3600),
      token_type: data.token_type || "Bearer",
    }).toString();
  
    res.redirect(`${frontendUri}/#${hash}`);
  }
  