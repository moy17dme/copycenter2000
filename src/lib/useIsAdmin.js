import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

function withTimeout(promise, ms, fallback) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function hasAdminRole(user, profile) {
  return (
    profile?.role === "admin" ||
    user?.app_metadata?.role === "admin"
  );
}

export function useIsAdmin({ user: knownUser = null, profile: knownProfile = null } = {}) {
  const knownAdmin = hasAdminRole(knownUser, knownProfile);
  const [loading, setLoading] = useState(!knownAdmin);
  const [isAdmin, setIsAdmin] = useState(knownAdmin);
  // Ref para saber si ya validamos al usuario como admin, sin depender del estado de React
  const isAdminRef = useRef(knownAdmin);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin(sessionUser = knownUser, { silent = false } = {}) {
      if (hasAdminRole(sessionUser, knownProfile)) {
        if (mounted) {
          isAdminRef.current = true;
          setIsAdmin(true);
          setLoading(false);
        }
        return;
      }

      // Si ya sabemos que es admin, re-validar en silencio sin mostrar spinner
      if (!silent) {
        if (mounted) setLoading(true);
      }

      const authResult = sessionUser
        ? { data: { user: sessionUser }, error: null }
        : await withTimeout(
            supabase.auth.getUser(),
            4500,
            { data: { user: null }, error: new Error("auth timeout") }
          );

      const { data: { user } = {}, error: authError } = authResult;
      if (authError || !user) {
        if (mounted) {
          isAdminRef.current = false;
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      // Timeout de 5s para evitar que la consulta cuelgue el spinner indefinidamente
      const profilePromise = supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 5000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (mounted) {
        const adminStatus = hasAdminRole(user, data) || (!error && data?.role === "admin");
        isAdminRef.current = adminStatus;
        setIsAdmin(adminStatus);
        setLoading(false);
      }
    }

    checkAdmin();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Si ya es admin, re-validar sin activar el spinner (evita el stuck-loading tras inactividad)
      checkAdmin(session?.user ?? null, { silent: isAdminRef.current });
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [
    knownUser?.id,
    knownUser?.app_metadata?.role,
    knownProfile?.role,
  ]);

  return { loading, isAdmin };
}
