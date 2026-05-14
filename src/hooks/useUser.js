import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user || null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return user;
}
