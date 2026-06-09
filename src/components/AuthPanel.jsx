import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
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
    const { error } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (error) alert(error.message);
  }

  async function handleForgotPassword() {
    if (!email) {
      alert("Escribe tu correo primero.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) alert(error.message);
    else setResetSent(true);
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
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <button className="btn-outline" type="button" onClick={handleSignUp} disabled={loading}>
          Crear cuenta
        </button>

        <button className="btn-outline" type="button" onClick={handleGuest} disabled={loading}>
          Entrar como invitado
        </button>
      </div>

      <div className="text-center">
        {resetSent ? (
          <p className="text-sm text-green-600">
            Te enviamos un enlace de recuperación. Revisa tu correo.
          </p>
        ) : (
          <button
            type="button"
            className="text-sm text-blue-500 hover:underline"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
      </div>
    </form>
  );
}
