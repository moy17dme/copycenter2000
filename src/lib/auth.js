import { supabase } from "./supabaseClient";
import { buildAccountTermsMetadata } from "./legalConsents";

// REGISTRO (sign up)
export async function signUpWithEmail({
  email,
  password,
  full_name,
  phone,
  address,
  company,
  termsAccepted = false,
}) {
  if (!termsAccepted) {
    throw new Error("Acepta los terminos y condiciones para crear tu cuenta.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
        address,
        company,
        ...buildAccountTermsMetadata(),
      }, // esto llega a raw_user_meta_data
    },
  });

  if (error) throw error;
  return data;
}

// LOGIN (sign in)
export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// LOGOUT
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
