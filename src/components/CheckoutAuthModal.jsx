import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { signInAndCheckMfa } from "../lib/authFlow";
import { buildAccountTermsMetadata } from "../lib/legalConsents";
import GoogleSignInButton from "./GoogleSignInButton";
import TermsConsentCheckbox from "./TermsConsentCheckbox";

function isValidWhatsapp(raw) {
  return /^\+?\d{10,15}$/.test(String(raw || "").trim());
}

function validateFullName(name) {
  const s = name.trim();
  if (!s) return "Escribe tu nombre completo.";
  const words = s.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 2) return "Escribe nombre y al menos un apellido.";
  if (words.some((w) => w.length < 2)) return "Cada parte debe tener al menos 2 letras.";
  if (/\d/.test(s)) return "El nombre no debe contener numeros.";
  if (/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'\-]/.test(s))
    return "Solo se permiten letras, espacios y guiones.";
  const lower = s.toLowerCase().replace(/\s+/g, "");
  const badPatterns = ["qwerty", "asdfg", "zxcvb", "qwer", "asdf", "abc", "xyz", "aaa", "zzz"];
  if (badPatterns.some((p) => lower.includes(p))) return "Escribe tu nombre real.";
  if (/(.)\1{3,}/.test(lower)) return "El nombre no parece valido.";
  const hasVowel = (w) => /[aeiouáéíóúü]/i.test(w);
  if (words.some((w) => !hasVowel(w))) return "Cada parte del nombre debe contener vocales.";
  return null;
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

function humanizeError(message) {
  const m = String(message || "").toLowerCase();
  if (!m) return "Ocurrio un error.";
  if (m.includes("invalid login credentials")) return "Credenciales incorrectas.";
  if (m.includes("user already registered")) return "Ese correo ya esta registrado.";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de iniciar sesion.";
  if (m.includes("failed to fetch")) return "Sin conexion. Revisa tu internet.";
  return message;
}

export default function CheckoutAuthModal({ open, onClose, onReady }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Login
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");

  // Registro
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [address, setAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaChallengeId, setMfaChallengeId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  const rules = useMemo(() => passwordRules(regPassword), [regPassword]);

  const reset = () => { setErr(""); setMsg(""); };

  if (!open) return null;

  async function handleSignIn(e) {
    e.preventDefault();
    reset();
    const input = loginInput.trim();
    if (!input) return setErr("Escribe tu correo o telefono.");
    if (!password) return setErr("Escribe tu contrasena.");
    setLoading(true);
    try {
      const result = await signInAndCheckMfa({ input, password });
      if (result.status === "mfa_required") {
        setMfaFactorId(result.factorId);
        setMfaChallengeId(result.challengeId);
        setMfaCode("");
        setMsg("Escribe el codigo de tu app autenticadora para terminar de entrar.");
        setMode("mfa");
        return;
      }
      onReady?.();
      onClose?.();
    } catch (ex) {
      setErr(humanizeError(ex?.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyMfa(e) {
    e.preventDefault();
    reset();
    const code = mfaCode.trim();
    if (code.length !== 6) return setErr("El codigo debe tener 6 digitos.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code,
      });
      if (error) return setErr("Codigo incorrecto. Intenta de nuevo.");
      onReady?.();
      onClose?.();
    } catch (ex) {
      setErr(humanizeError(ex?.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    reset();
    const nameErr = validateFullName(nombre);
    if (nameErr) return setErr(nameErr);
    if (!isValidWhatsapp(whatsapp)) return setErr("WhatsApp invalido. Usa formato +52XXXXXXXXXX.");
    const e2 = regEmail.trim();
    if (!e2) return setErr("Escribe tu correo.");
    const a = address.trim();
    if (!a) return setErr("Escribe tu direccion.");
    if (!isStrongPassword(regPassword)) return setErr("La contrasena no cumple los requisitos de seguridad.");
    if (regPassword !== regPassword2) return setErr("Las contrasenas no coinciden.");
    if (!termsAccepted) return setErr("Acepta los terminos y condiciones para crear tu cuenta.");

    setLoading(true);
    try {
      const termsMetadata = buildAccountTermsMetadata();
      const { error } = await supabase.auth.signUp({
        email: e2,
        password: regPassword,
        options: {
          data: {
            full_name: nombre.trim(),
            whatsapp: whatsapp.trim(),
            address: a,
            ...termsMetadata,
          },
        },
      });
      if (error) return setErr(humanizeError(error.message));
      setMsg("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.");
      setMode("signin");
    } catch (ex) {
      setErr(humanizeError(ex?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 grid place-items-center z-[10000] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-950/95 z-10">
          <div>
            <h3 className="text-white font-semibold">
              {mode === "signin" ? "Iniciar sesion" : "Crear cuenta"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Necesitas una cuenta para continuar.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white">X</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => { setMode("signin"); setMfaCode(""); setTermsAccepted(false); reset(); }}
              className={`px-3 py-1.5 text-xs rounded-lg ${mode === "signin" ? "bg-white/15 text-white" : "text-slate-300"}`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setMfaCode(""); setTermsAccepted(false); reset(); }}
              className={`px-3 py-1.5 text-xs rounded-lg ${mode === "signup" ? "bg-white/15 text-white" : "text-slate-300"}`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Mensajes */}
          {err && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">{err}</div>
          )}
          {msg && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">{msg}</div>
          )}

          {(mode === "signin" || mode === "signup") && (
            <GoogleSignInButton
              resumeCheckout
              dividerLabel="o usa tu correo"
              onError={(error) => setErr(humanizeError(error?.message))}
            />
          )}

          {/* ── Login ── */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Correo electronico</label>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="tucorreo@gmail.com"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Contrasena</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white">
                  Cerrar
                </button>
              </div>
            </form>
          )}

          {/* ── Registro ── */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Nombre completo</label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Ej. Juan Garcia Lopez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">Nombre y apellido(s) reales, sin numeros.</p>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">WhatsApp</label>
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
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Correo electronico</label>
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
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Direccion</label>
                <input
                  type="text"
                  autoComplete="street-address"
                  placeholder="Calle, numero, colonia, ciudad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Contrasena</label>
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
                <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-300/80 mb-1">Confirmar contrasena</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={regPassword2}
                  onChange={(e) => setRegPassword2(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-900 px-3 py-2 text-sm outline-none"
                />
              </div>
              <TermsConsentCheckbox
                checked={termsAccepted}
                onChange={setTermsAccepted}
                disabled={loading}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold disabled:opacity-60"
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white">
                  Cerrar
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Tu WhatsApp se usara para contactarte sobre tu pedido.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
