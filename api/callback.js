export default async function handler(req, res) {
    try {
      const { code, error } = req.query;
      if (error) return res.redirect(`${process.env.FRONTEND_URI}/#error=${encodeURIComponent(error)}`);
      if (!code)  return res.redirect(`${process.env.FRONTEND_URI}/#error=missing_code`);
  
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,       // <— same as /login
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      });
  
      const r = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const tok = await r.json();
      if (!r.ok) {
        const msg = tok?.error_description || tok?.error || "token_exchange_failed";
        return res.redirect(`${process.env.FRONTEND_URI}/#error=${encodeURIComponent(msg)}`);
      }
  
      const scopeStr = tok.scope || "";
      if (!scopeStr.split(" ").includes("streaming")) {
        return res.redirect(`${process.env.FRONTEND_URI}/#error=missing_streaming_scope`);
      }
  
      const qp = new URLSearchParams({
        access_token: tok.access_token,
        token_type: tok.token_type || "Bearer",
        expires_in: String(tok.expires_in || 3600),
        scope: scopeStr
      });
      return res.redirect(`${process.env.FRONTEND_URI}/#${qp.toString()}`);
    } catch (e) {
      return res.redirect(`${process.env.FRONTEND_URI}/#error=unexpected_error`);
    }
  }
  