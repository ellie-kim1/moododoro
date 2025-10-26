// api/callback.js
export default async function handler(req, res) {
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const base  = `${proto}://${host}`;
  
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: req.query.code,
      redirect_uri: `${base}/api/callback`,
    });
  
    const auth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
  
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body,
    });
  
    const data = await r.json();
    if (!r.ok) return res.status(500).send("Token exchange failed");
  
    const hash = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token || "",
      expires_in: String(data.expires_in || 3600),
      token_type: data.token_type || "Bearer",
    }).toString();
  
    res.redirect(`${base}/#${hash}`);
}
  