import { useState } from "react";
import { useUser } from "../hooks/useUser";
import CheckoutAuthModal from "./CheckoutAuthModalMfa";

export default function CheckoutGate({ onCheckout }) {
  const user = useUser();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="card p-4 mt-4 flex items-center justify-between">
        <div className="kpi">
          {user ? <>Sesión: <b>{user.email || "cliente"}</b></> : "Inicia sesión o crea una cuenta para continuar al pago."}
        </div>
        <button
          className="btn-primary"
          onClick={() => (user ? onCheckout?.() : setOpen(true))}
        >
          Continuar al pago
        </button>
      </div>

      <CheckoutAuthModal
        open={open}
        onClose={() => setOpen(false)}
        onReady={() => {
          setOpen(false);
          onCheckout?.();
        }}
      />
    </>
  );
}
