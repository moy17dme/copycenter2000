import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVerifiedTotpChallenge } from "../lib/authFlow";
import {
  OAUTH_RESUME_CHECKOUT_KEY,
  sanitizeOAuthReturnPath,
} from "../lib/googleAuth";
import { supabase } from "../lib/supabaseClient";

function readAuthParams() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const read = (key) => search.get(key) || hash.get(key);

  return {
    code: read("code"),
    error: read("error_description") || read("error"),
    next: sanitizeOAuthReturnPath(search.get("next") || "/"),
    resumeCheckout: search.get("resume") === "checkout",
  };
}

function humanizeCallbackError(message) {
  const value = String(message || "");
  const lower = value.toLowerCase();
  if (lower.includes("access_denied") || lower.includes("access denied")) {
    return "Cancelaste el acceso con Google. Puedes intentarlo de nuevo.";
  }
  if (lower.includes("provider is not enabled")) {
    return "El acceso con Google aun no esta habilitado.";
  }
  if (lower.includes("redirect")) {
    return "La direccion de regreso no esta autorizada.";
  }
  return value || "No se pudo conectar la cuenta.";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const destinationRef = useRef({ next: "/", resumeCheckout: false });
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaChallengeId, setMfaChallengeId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  const finishSignIn = useCallback(() => {
    const destination = destinationRef.current;
    if (destination.resumeCheckout) {
      try {
        sessionStorage.setItem(OAUTH_RESUME_CHECKOUT_KEY, "1");
      } catch {
        // La sesion sigue siendo valida aunque el navegador bloquee storage.
      }
    }
    navigate(destination.next, { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = readAuthParams();
        destinationRef.current = {
          next: params.next,
          resumeCheckout: params.resumeCheckout,
        };

        if (params.error) throw new Error(params.error);

        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session && params.code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(params.code);

          if (exchangeError) {
            const current = await supabase.auth.getSession();
            session = current.data.session;
            if (!session) throw exchangeError;
          } else {
            const current = await supabase.auth.getSession();
            session = current.data.session;
          }
        }

        if (!session) {
          throw new Error("No se recibio una sesion valida de Google.");
        }

        const challenge = await createVerifiedTotpChallenge();
        if (cancelled) return;

        if (challenge) {
          setMfaFactorId(challenge.factorId);
          setMfaChallengeId(challenge.challengeId);
          setStatus("mfa");
          return;
        }

        finishSignIn();
      } catch (authError) {
        const message = authError?.message || "";
        if (!message.toLowerCase().includes("access_denied")) {
          console.warn("[AuthCallback]", message);
        }
        if (!cancelled) {
          setError(humanizeCallbackError(message));
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [finishSignIn]);

  const verifyMfa = async (event) => {
    event.preventDefault();
    if (mfaCode.length !== 6) return;

    setStatus("verifying");
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;
      finishSignIn();
    } catch {
      setError("El codigo no es correcto. Intenta de nuevo.");
      setStatus("mfa");
    }
  };

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-white px-4">
        <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  if (status === "mfa" || status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-white">
        <form
          onSubmit={verifyMfa}
          className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
        >
          <h1 className="text-lg font-semibold">Verificacion en 2 pasos</h1>
          <p className="mt-1 text-sm text-slate-400">
            Escribe el codigo de 6 digitos de tu app autenticadora.
          </p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={mfaCode}
            onChange={(event) =>
              setMfaCode(event.target.value.replace(/\D/g, ""))
            }
            className="mt-5 w-full rounded-xl bg-slate-50 px-3 py-3 text-center text-lg tracking-[0.35em] text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Codigo de verificacion"
          />

          <button
            type="submit"
            disabled={status === "verifying" || mfaCode.length !== 6}
            className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "verifying" ? "Verificando..." : "Confirmar acceso"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-white">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Conectando tu cuenta de Google...</p>
    </div>
  );
}
