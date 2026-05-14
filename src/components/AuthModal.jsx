// src/components/AuthModal.jsx
import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { isPhoneInput, signInAndCheckMfa } from "../lib/authFlow";

// ─── Utilidades ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isValidWhatsapp(raw) {
  const v = String(raw || "").trim();
  return /^\+?\d{10,15}$/.test(v);
}

// Validacion de nombre real: al menos 2 palabras, sin numeros, sin patrones de teclado
function validateFullName(name) {
  const s = name.trim();
  if (!s) return "Escribe tu nombre completo.";

  const words = s.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 2) return "Escribe nombre y al menos un apellido.";
  if (words.some((w) => w.length < 2)) return "Cada parte debe tener al menos 2 letras.";
  if (s.length > 80) return "Nombre demasiado largo.";
  if (/\d/.test(s)) return "El nombre no debe contener numeros.";
  if (/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'\-]/.test(s))
    return "Solo se permiten letras, espacios y guiones.";

  // Patrones de teclado o sin sentido
  const lower = s.toLowerCase().replace(/\s+/g, "");
  const badPatterns = ["qwerty", "asdfg", "zxcvb", "qwer", "asdf", "abc", "xyz", "aaa", "zzz", "123"];
  if (badPatterns.some((p) => lower.includes(p))) return "Escribe tu nombre real.";

  // Repeticion excesiva de un caracter
  if (/(.)\1{3,}/.test(lower)) return "El nombre no parece valido.";

  // Cada palabra debe tener al menos una vocal
  const hasVowel = (w) => /[aeiouáéíóúü]/i.test(w);
  if (words.some((w) => !hasVowel(w))) return "Cada parte del nombre debe contener vocales.";

  return null; // valido
}

function passwordRules(pw) {
  const s = String(pw || "");
  return {
    min: s.length >= 10,
    upper: /[A-Z]/.test(s),
    lower: /[a-z]/.test(s),
    number: /\d/.test(s),
    symbol: /[^A-Za-z0-9]/.test(s),
  };
}

function isStrongPassword(pw) {
  const r = passwordRules(pw);
  return r.min && r.upper && r.lower && r.number && r.symbol;
}

function humanizeAuthError(message) {
  const m = String(message || "");
  const lower = m.toLowerCase();
  if (!m) return "Ocurrio un error.";
  if (lower.includes("failed to fetch"))
    return "Sin conexion o Supabase bloqueado (VPN/AdBlock).";
  if (lower.includes("email not confirmed"))
    return "Confirma tu correo antes de iniciar sesion.";
  if (lower.includes("invalid login credentials"))
    return "Credenciales incorrectas.";
  if (lower.includes("user already registered"))
    return "Ese correo ya esta registrado.";
  if (lower.includes("invalid phone"))
    return "Numero de telefono invalido.";
  if (lower.includes("redirect") && lower.includes("uri"))
    return "Redirect URL incorrecta. Revisa Auth -> URL Configuration.";
  return m;
}

function clearAuthStorageHard() {
  try {
    localStorage.removeItem("copycenter2000-auth");
    sessionStorage.removeItem("copycenter2000-auth");
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k);
      if (k.toLowerCase().includes("supabase") && k.toLowerCase().includes("auth"))
        localStorage.removeItem(k);
    }
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) sessionStorage.removeItem(k);
      if (k.toLowerCase().includes("supabase") && k.toLowerCase().includes("auth"))
        sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function AuthModal({ open, onClose, onSignedOut, user: userProp, displayName }) {
  // "login" | "register" | "2fa" | "enroll2fa"
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Campos login
  const [loginInput, setLoginInput] = useState(""); // email o telefono
  const [password, setPassword] = useState("");

  // Campos registro
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");

  // 2FA — verificacion
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaChallengeId, setMfaChallengeId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  // 2FA — enrollment (activacion)
  const [enrollFactorId, setEnrollFactorId] = useState(null);
  const [enrollQr, setEnrollQr] = useState(null);
  const [enrollSecret, setEnrollSecret] = useState(null);
  const [enrollCode, setEnrollCode] = useState("");

  const user = userProp ?? null;
  const rules = useMemo(() => passwordRules(regPassword), [regPassword]);

  const resetMessages = () => { setErr(""); setMsg(""); };

  const close = () => {
    setLoading(false);
    resetMessages();
    onClose?.();
  };

  const switchMode = (m) => {
    resetMessages();
    setMode(m);
    setPassword("");
    setRegPassword("");
    setRegPassword2("");
    setRegAddress("");
    setMfaCode("");
  };

  // ── Login (email o telefono) ────────────────────────────────────────────────
  const handleLogin = async () => {
    resetMessages();
    const input = loginInput.trim();
    if (!input) return setErr("Escribe tu correo o numero de telefono.");
    if (!password) return setErr("Escribe tu contrasena.");

    try {
      setLoading(true);
      const result = await signInAndCheckMfa({ input, password });

      if (result.status === "mfa_required") {
        setMfaFactorId(result.factorId);
        setMfaChallengeId(result.challengeId);
        setMode("2fa");
        return;
      }

      setMsg("Sesion iniciada correctamente.");
      await sleep(300);
      close();
    } catch (ex) {
      setErr(humanizeAuthError(ex?.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Registro ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    resetMessages();
    const nameErr = validateFullName(nombre);
    if (nameErr) return setErr(nameErr);

    const w = whatsapp.trim();
    if (!w) return setErr("Escribe tu numero de WhatsApp.");
    if (!isValidWhatsapp(w)) return setErr("WhatsApp invalido. Usa formato +52XXXXXXXXXX.");

    const e = regEmail.trim();
    if (!e) return setErr("Escribe tu correo electronico.");
    const a = regAddress.trim();
    if (!a) return setErr("Escribe tu direccion.");
    if (!regPassword) return setErr("Escribe una contrasena.");
    if (!isStrongPassword(regPassword)) return setErr("La contrasena no cumple los requisitos.");
    if (regPassword !== regPassword2) return setErr("Las contrasenas no coinciden.");

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: e,
        password: regPassword,
        options: { data: { full_name: nombre.trim(), whatsapp: w, address: a } },
      });
      if (error) return setErr(humanizeAuthError(error.message));
      setMsg("Cuenta creada. Revisa tu correo para confirmar.");
      await sleep(500);
      close();
    } catch (ex) {
      setErr(humanizeAuthError(ex?.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar 2FA ──────────────────────────────────────────────────────────
  const handle2FAVerify = async () => {
    resetMessages();
    const code = mfaCode.trim();
    if (code.length !== 6) return setErr("El codigo debe tener 6 digitos.");

    try {
      setLoading(true);
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code,
      });
      if (error) return setErr("Codigo incorrecto. Intenta de nuevo.");
      setMsg("Verificacion exitosa.");
      await sleep(300);
      close();
    } catch (ex) {
      setErr(humanizeAuthError(ex?.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Iniciar enrollment 2FA ─────────────────────────────────────────────────
  const handleStartEnroll = async () => {
    resetMessages();
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) return setErr(humanizeAuthError(error.message));
      setEnrollFactorId(data.id);
      setEnrollQr(data.totp.qr_code);
      setEnrollSecret(data.totp.secret);
      setMode("enroll2fa");
    } catch (ex) {
      setErr(humanizeAuthError(ex?.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmar enrollment 2FA ───────────────────────────────────────────────
  const handleConfirmEnroll = async () => {
    resetMessages();
    const code = enrollCode.trim();
    if (code.length !== 6) return setErr("El codigo debe tener 6 digitos.");

    try {
      setLoading(true);
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
        factorId: enrollFactorId,
      });
      if (cErr) return setErr(humanizeAuthError(cErr.message));

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) return setErr("Codigo incorrecto. Intenta de nuevo.");

      setMsg("Verificacion en 2 pasos activada.");
      await sleep(400);
      setMode("account");
      setEnrollQr(null);
      setEnrollSecret(null);
      setEnrollCode("");
    } catch (ex) {
      setErr(humanizeAuthError(ex?.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignorar errores de red
    }
    clearAuthStorageHard();
    window.location.reload();
  };

  if (!open) return null;

  const name =
    (displayName || "").trim() ||
    (user?.user_metadata?.full_name || "").trim() ||
    user?.email ||
    "Usuario";

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={close}
        aria-label="Cerrar"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-950/95 z-10">
            <div>
              <h3 className="text-white font-semibold">
                {user
                  ? mode === "enroll2fa" ? "Activar verificacion en 2 pasos" : "Tu cuenta"
                  : mode === "login" ? "Iniciar sesion"
                  : mode === "register" ? "Crear cuenta"
                  : mode === "2fa" ? "Verificacion en 2 pasos"
                  : "Tu cuenta"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {user
                  ? "Gestiona tu sesion y seguridad."
                  : "Accede para gestionar tus pedidos."}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white"
              aria-label="Cerrar"
            >
              X
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Mensajes */}
            {err && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
                {err}
              </div>
            )}
            {msg && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
                {msg}
              </div>
            )}

            {/* ── Usuario logueado ── */}
            {user && mode !== "enroll2fa" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white font-semibold">{name}</div>
                  <div className="text-[12px] text-slate-400 mt-1">{user.email}</div>
                </div>

                <button
                  type="button"
                  onClick={handleStartEnroll}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm disabled:opacity-60"
                >
                  Activar verificacion en 2 pasos (2FA)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white disabled:opacity-60"
                  >
                    {loading ? "Cerrando..." : "Cerrar sesion"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* ── Enrollment 2FA ── */}
            {user && mode === "enroll2fa" && (
              <div className="space-y-4">
                <p className="text-[12px] text-slate-300">
                  Escanea el codigo QR con Google Authenticator o cualquier app TOTP.
                </p>

                {enrollQr && (
                  <div className="flex justify-center">
                    <img
                      src={enrollQr}
                      alt="QR Code 2FA"
                      className="w-40 h-40 rounded-xl bg-white p-2"
                    />
                  </div>
                )}

                {enrollSecret && (
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Clave manual:</p>
                    <p className="text-xs text-white font-mono tracking-widest break-all">
                      {enrollSecret}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                    Codigo de verificacion (6 digitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={enrollCode}
                    onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none text-center tracking-widest"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmEnroll}
                    disabled={loading || enrollCode.length !== 6}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold disabled:opacity-60"
                  >
                    {loading ? "Verificando..." : "Activar 2FA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("account"); setEnrollQr(null); setEnrollSecret(null); setEnrollCode(""); resetMessages(); }}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Verificacion 2FA tras login ── */}
            {!user && mode === "2fa" && (
              <div className="space-y-4">
                <p className="text-[12px] text-slate-300">
                  Abre tu app de autenticacion y escribe el codigo de 6 digitos.
                </p>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                    Codigo
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none text-center tracking-widest"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handle2FAVerify}
                    disabled={loading || mfaCode.length !== 6}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold disabled:opacity-60"
                  >
                    {loading ? "Verificando..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white"
                  >
                    Atras
                  </button>
                </div>
              </div>
            )}

            {/* ── Login / Registro ── */}
            {!user && (mode === "login" || mode === "register") && (
              <>
                {/* Tabs */}
                <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`px-3 py-1.5 text-xs rounded-lg ${mode === "login" ? "bg-white/15 text-white" : "text-slate-300"}`}
                  >
                    Iniciar sesion
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={`px-3 py-1.5 text-xs rounded-lg ${mode === "register" ? "bg-white/15 text-white" : "text-slate-300"}`}
                  >
                    Crear cuenta
                  </button>
                </div>

                {/* ── Campos Registro ── */}
                {mode === "register" && (
                  <>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder="Ej. Juan Garcia Lopez"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Nombre y apellido(s) reales, sin numeros.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+52XXXXXXXXXX"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Correo electronico
                      </label>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="tucorreo@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Direccion
                      </label>
                      <input
                        type="text"
                        autoComplete="street-address"
                        placeholder="Calle, numero, colonia, ciudad"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Contrasena
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                      <div className="mt-2 text-[11px] text-slate-300/80 space-y-1">
                        <div className={rules.min ? "text-emerald-300" : ""}>- Minimo 10 caracteres</div>
                        <div className={rules.upper ? "text-emerald-300" : ""}>- 1 mayuscula (A-Z)</div>
                        <div className={rules.lower ? "text-emerald-300" : ""}>- 1 minuscula (a-z)</div>
                        <div className={rules.number ? "text-emerald-300" : ""}>- 1 numero (0-9)</div>
                        <div className={rules.symbol ? "text-emerald-300" : ""}>- 1 simbolo (!@#$...)</div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Confirmar contrasena
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={regPassword2}
                        onChange={(e) => setRegPassword2(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </>
                )}

                {/* ── Campos Login ── */}
                {mode === "login" && (
                  <>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Correo o telefono
                      </label>
                      <input
                        type="text"
                        autoComplete="username"
                        placeholder="tucorreo@gmail.com o +52XXXXXXXXXX"
                        value={loginInput}
                        onChange={(e) => setLoginInput(e.target.value)}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">
                        Contrasena
                      </label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                        className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Botones principales */}
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={mode === "login" ? handleLogin : handleRegister}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold disabled:opacity-60"
                  >
                    {loading
                      ? "Procesando..."
                      : mode === "login"
                      ? "Entrar"
                      : "Crear cuenta"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white"
                  >
                    Cerrar
                  </button>
                </div>

                {mode === "register" && (
                  <p className="text-[11px] text-slate-400">
                    Tu WhatsApp se usa para contactarte sobre tu pedido.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
