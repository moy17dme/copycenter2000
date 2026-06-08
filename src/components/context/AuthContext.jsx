// src/context/AuthContext.jsx (o AuthProvider.jsx)
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  loadingAuth: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Carga sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    }).catch(() => setLoadingAuth(false));

    // Escucha cambios (login, logout, refresh token, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Si el token expiró o fue revocado, limpiar sesión almacenada
      if (event === "TOKEN_REFRESHED" && !session) {
        supabase.auth.signOut().catch(() => {});
      }
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        // Limpiar cualquier token cacheado para evitar bucles de reintento
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.includes("copycenter2000-auth") || k.startsWith("sb-")) {
              localStorage.removeItem(k);
            }
          }
        } catch { /* ignore */ }
      }
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);