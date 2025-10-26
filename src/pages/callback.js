// pages/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const token = params.get("access_token");
      const error = params.get("error");

      if (error) alert("Spotify OAuth Error: " + error);
      if (token) localStorage.setItem("spotify_token", token);
    }
    router.replace("/"); // go back to main app
  }, [router]);

  return <div>Redirecting...</div>;
}