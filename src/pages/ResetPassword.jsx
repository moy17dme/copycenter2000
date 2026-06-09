import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  // Estados del flujo
  const [ready, setReady] = useState(false);   // sesión temporal activa
  const [error, setError] = useState(null);

  // Formulario
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Al cargar, Supabase (PKCE) trae ?code=… → intercambiamos por sesión
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorDesc = params.get("error_description") || params.get("error");

        if (errorDesc) throw new Error(decodeURIComponent(errorDesc));

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("[ResetPassword]", err);
        if (!cancelled) setError(err.message || "El enlace no es válido o ya expiró.");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      // Redirige al inicio después de 2 segundos
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
  }

  // ── Error irrecuperable (enlace caducado, etc.) ──
  if (error && !ready) {
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

  // ── Cargando intercambio de código ──
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-white">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Verificando enlace…</p>
      </div>
    );
  }

  // ── Contraseña actualizada ──
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-white px-4">
        <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-lg font-semibold">¡Contraseña actualizada!</p>
        <p className="text-sm text-slate-400">Redirigiendo al inicio…</p>
      </div>
    );
  }

  // ── Formulario ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white px-4">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5">
        <h1 className="text-xl font-bold text-center">Nueva contraseña</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-400">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              required
              className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
          >
            {loading ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
