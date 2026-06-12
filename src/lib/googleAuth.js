import {
  supabase,
  supabaseAnonKey,
  supabaseUrl,
} from "./supabaseClient";

export const OAUTH_RESUME_CHECKOUT_KEY = "copycenter2000-oauth-resume-checkout";

let googleAvailabilityPromise = null;

function currentPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function sanitizeOAuthReturnPath(value) {
  if (typeof window === "undefined") return "/";

  try {
    const url = new URL(value || "/", window.location.origin);
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    if (url.origin !== window.location.origin) return "/";
    if (normalizedPath === "/auth/callback") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function isGoogleAuthEnabled({ refresh = false } = {}) {
  if (!googleAvailabilityPromise || refresh) {
    googleAvailabilityPromise = fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: supabaseAnonKey,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo consultar la configuracion de acceso.");
        }
        const settings = await response.json();
        return settings?.external?.google === true;
      })
      .catch(() => false);
  }

  return googleAvailabilityPromise;
}

export function buildGoogleOAuthRedirect({
  returnTo = currentPath(),
  resumeCheckout = false,
} = {}) {
  if (typeof window === "undefined") {
    throw new Error("El acceso con Google solo esta disponible en el navegador.");
  }

  const callback = new URL("/auth/callback/", window.location.origin);
  callback.searchParams.set("next", sanitizeOAuthReturnPath(returnTo));
  if (resumeCheckout) callback.searchParams.set("resume", "checkout");
  return callback.toString();
}

export async function signInWithGoogle(options = {}) {
  const enabled = await isGoogleAuthEnabled();
  if (!enabled) {
    throw new Error(
      "El acceso con Google aun no esta habilitado. Intenta con tu correo."
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildGoogleOAuthRedirect(options),
      scopes: "openid email profile",
    },
  });

  if (error) throw error;
  return data;
}
