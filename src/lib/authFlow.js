import { supabase } from "./supabaseClient";

function normalizePhone(input) {
  return String(input || "").trim().replace(/[\s\-().]/g, "");
}

export function isPhoneInput(value) {
  return /^\+?\d{8,15}$/.test(normalizePhone(value));
}

export async function resolveEmailFromLoginInput(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Escribe tu correo o numero de telefono.");

  if (!isPhoneInput(raw)) return raw;

  const { data: foundEmail, error } = await supabase.rpc("get_email_by_phone", {
    phone_input: normalizePhone(raw),
  });

  if (error || !foundEmail) {
    throw new Error("No encontramos una cuenta con ese numero de telefono.");
  }

  return foundEmail;
}

export async function signInAndCheckMfa({ input, password }) {
  const email = await resolveEmailFromLoginInput(input);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;

  const totpFactor = factorsData?.totp?.find((factor) => factor.status === "verified");
  if (!totpFactor) {
    return { status: "signed_in", data, email };
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });
  if (challengeError) throw challengeError;

  return {
    status: "mfa_required",
    data,
    email,
    factorId: totpFactor.id,
    challengeId: challenge.id,
  };
}
