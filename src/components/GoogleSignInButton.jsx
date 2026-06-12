import { useEffect, useState } from "react";
import {
  isGoogleAuthEnabled,
  signInWithGoogle,
} from "../lib/googleAuth";

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className="h-[18px] w-[18px] shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.26-.16-1.86H9v3.52h4.84a4.14 4.14 0 0 1-1.8 2.72v2.28h2.92c1.71-1.57 2.68-3.89 2.68-6.66Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.48-.81 5.97-2.18l-2.92-2.28c-.81.54-1.85.86-3.05.86-2.35 0-4.34-1.59-5.05-3.72H.93v2.35A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.68A5.42 5.42 0 0 1 3.67 9c0-.58.1-1.14.28-1.68V4.97H.93A9 9 0 0 0 0 9c0 1.45.35 2.82.93 4.03l3.02-2.35Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .93 4.97l3.02 2.35C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  returnTo,
  resumeCheckout = false,
  dividerLabel,
  onError,
  className = "",
}) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    isGoogleAuthEnabled({ refresh: true }).then((enabled) => {
      if (!active) return;
      setAvailable(enabled);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (checking || !available) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await signInWithGoogle({ returnTo, resumeCheckout });
    } catch (error) {
      setLoading(false);
      onError?.(error);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-65"
      >
        <GoogleMark />
        {loading ? "Abriendo Google..." : "Continuar con Google"}
      </button>

      {dividerLabel && (
        <div className="mt-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] text-slate-500">{dividerLabel}</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
      )}
    </div>
  );
}
