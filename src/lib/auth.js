import { supabase } from "./supabaseClient";

// REGISTRO (sign up)
export async function signUpWithEmail({ email, password, full_name, phone, address }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone, address }, // esto llega a raw_user_meta_data
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
