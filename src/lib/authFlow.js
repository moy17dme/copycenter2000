import { supabase } from "./supabaseClient";

function normalizePhone(input) {
  return String(input || "").trim().replace(/[\s\-().]/g, "");
}

export function isPhoneInput(value) {
  return /^\+?\d{8,15}$/.test(normalizePhone(value));
}

export async function resolveEmailFromLoginInput(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Escribe tu correo.");

  if (isPhoneInput(raw)) {
    throw new Error(
      "Por seguridad, inicia sesion con tu correo. El acceso por telefono esta deshabilitado."
    );
  }

  return raw;
}

export async function signInAndCheckMfa({ input, password }) {
  const email = await resolveEmailFromLoginInput(input);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const challenge = await createVerifiedTotpChallenge();
  if (!challenge) {
    return { status: "signed_in", data, email };
  }

  return {
    status: "mfa_required",
    data,
    email,
    factorId: challenge.factorId,
    challengeId: challenge.challengeId,
  };
}

export async function createVerifiedTotpChallenge() {
  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  if (assurance?.currentLevel === "aal2") return null;

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;

  const totpFactor = factorsData?.totp?.find((factor) => factor.status === "verified");
  if (!totpFactor) return null;

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });
  if (challengeError) throw challengeError;

  return {
    factorId: totpFactor.id,
    challengeId: challenge.id,
  };
}
