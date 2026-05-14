import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();            // ← evita submit por defecto
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert(error.message);
  }

  async function handleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) alert(error.message);
    else alert("Cuenta creada. Inicia sesión.");
  }

  async function handleGuest() {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously(); // ← SOLO aquí
    setLoading(false);
    if (error) alert(error.message);
  }

  return (
    <form className="card p-4 space-y-3" onSubmit={handleSignIn}>
      <input
        className="input"
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex gap-2 flex-wrap">
        {/* ENTRAR: es submit y usa signInWithPassword */}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>

        {/* CREAR CUENTA: type="button" para NO disparar submit */}
        <button className="btn-outline" type="button" onClick={handleSignUp} disabled={loading}>
          Crear cuenta
        </button>

        {/* INVITADO: type="button" para NO disparar submit */}
        <button className="btn-outline" type="button" onClick={handleGuest} disabled={loading}>
          Entrar como invitado
        </button>
      </div>
    </form>
  );
}
