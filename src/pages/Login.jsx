import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) return setErr(error.message);

    nav("/admin");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <h1 className="text-white text-lg font-semibold">Acceso administrador</h1>

        <label className="block mt-4 text-xs text-slate-300">Correo</label>
        <input
          className="mt-1 w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label className="block mt-3 text-xs text-slate-300">Contraseña</label>
        <input
          className="mt-1 w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        {err && <p className="mt-3 text-xs text-red-300">{err}</p>}

        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold py-2 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
