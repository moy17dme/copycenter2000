import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Supabase con PKCE manda ?code=... en la URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorDesc = params.get("error_description") || params.get("error");

        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc));
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // Espera breve para que onAuthStateChange en App.jsx procese la sesion
        await new Promise((r) => setTimeout(r, 300));

        if (!cancelled) navigate("/", { replace: true });
      } catch (err) {
        console.error("[AuthCallback]", err);
        if (!cancelled) setError(err.message || "Error al conectar cuenta.");
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-white px-4">
        <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-white">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Conectando cuenta...</p>
    </div>
  );
}
