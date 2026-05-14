import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthPanel from "./AuthPanel";

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [probe, setProbe] = useState({ ok: false, rows: 0, error: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // lee cualquiera de tus tablas creadas: products o sizes
      const { data, error } = await supabase.from("products").select("id").limit(5);
      setProbe({ ok: !error, rows: data?.length || 0, error: error?.message || null });
      console.log("Supabase probe:", { data, error });
    })();
  }, [user]);

  if (!user) return <AuthPanel />;

  return (
    <div className="card p-5 space-y-3">
      <div className="text-slate-900">
        Sesión iniciada como <b>{user.email || user.user_metadata?.full_name || user.id}</b>
      </div>

      <div className="kpi">
        Prueba de conexión: {probe.ok ? `OK (${probe.rows} filas)` : `Error: ${probe.error}`}
      </div>

      <div className="flex gap-2">
        <button
          className="btn-primary"
          onClick={async () => {
            // inserción de prueba (opcional): crea un borrador de pedido
            const { data, error } = await supabase
              .from("orders")
              .insert({ user_id: user.id, status: "draft", total: 0 })
              .select()
              .single();
            alert(error ? `Error: ${error.message}` : `Order creada: ${data.id}`);
          }}
        >
          Crear pedido de prueba
        </button>

        <button className="btn-outline" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
