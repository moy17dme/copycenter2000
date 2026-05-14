import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) { setIsAdmin(false); setLoading(false); }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setIsAdmin(!error && data?.role === "admin");
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return { loading, isAdmin };
}
