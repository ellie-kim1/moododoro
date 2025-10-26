// /api/callback
export default async function handler(req, res) {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`${process.env.FRONTEND_URI}/#error=${encodeURIComponent(error)}`);
    if (!code)  return res.redirect(`${process.env.FRONTEND_URI}/#error=missing_code`);

    // IMPORTANT: Use the SAME redirect_uri you used when sending to /authorize
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

    // Exchange code -> token
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
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
      // surface error
      return res.redirect(`${process.env.FRONTEND_URI}/#error=${encodeURIComponent(tok.error_description || 'token_exchange_failed')}`);
    }

    // Optional: verify scopes include "streaming"
    const scopeStr = tok.scope || "";
    if (!scopeStr.split(" ").includes("streaming")) {
      return res.redirect(`${process.env.FRONTEND_URI}/#error=missing_streaming_scope`);
    }

    // hand token to SPA via hash (your SPA already parses it)
    // you could also set an HttpOnly cookie and proxy calls if you prefer
    const qp = new URLSearchParams({
      access_token: tok.access_token,
      token_type: tok.token_type,
      expires_in: String(tok.expires_in),
      scope: scopeStr
    });
    return res.redirect(`${process.env.FRONTEND_URI}/#${qp.toString()}`);
  } catch (e) {
    return res.redirect(`${process.env.FRONTEND_URI}/#error=${encodeURIComponent('unexpected_error')}`);
  }
}