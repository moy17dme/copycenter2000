import { useState } from "react";
import { signInWithEmail, signOut, signUpWithEmail } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

export default function AuthTest() {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      if (mode === "register") {
        await signUpWithEmail({
          email,
          password,
          full_name: fullName,
          phone,
          company,
        });
        setMsg("✅ Registro listo. Revisa tu correo si la confirmación está activa.");
      } else {
        await signInWithEmail({ email, password });
        setMsg("✅ Sesión iniciada.");
      }
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      setMsg("✅ Sesión cerrada.");
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>Auth Test</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode("login")}>Login</button>
        <button onClick={() => setMode("register")}>Registro</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        {mode === "register" && (
          <>
            <input placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input placeholder="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
          </>
        )}

        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button type="submit">{mode === "register" ? "Crear cuenta" : "Entrar"}</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleLogout}>Cerrar sesión</button>
      </div>

      <SessionInfo />
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}

function SessionInfo() {
  const [email, setEmail] = useState("");

  async function load() {
    const { data } = await supabase.auth.getUser();
    setEmail(data?.user?.email || "");
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={load}>Ver usuario actual</button>
      {email && <p>👤 Logueado como: {email}</p>}
    </div>
  );
}
