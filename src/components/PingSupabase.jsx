import { useState } from "react";
import { pingSupabase } from "../lib/supabaseClient";

export default function PingSupabase() {
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);

  async function handlePing() {
    setOut(null);
    setErr(null);
    try {
      const res = await pingSupabase();
      setOut(res);
      console.log("PING RESULT:", res);
    } catch (e) {
      setErr(String(e));
      console.error("PING ERROR:", e);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 700, margin: "20px auto" }}>
      <button onClick={handlePing}>Probar conexión a Supabase</button>

      {err && (
        <pre style={{ marginTop: 12, color: "crimson" }}>
          ERROR: {err}
        </pre>
      )}

      {out && (
        <pre style={{ marginTop: 12 }}>
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}
