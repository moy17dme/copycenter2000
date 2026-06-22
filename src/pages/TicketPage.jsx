import { CheckCircle2, Ticket } from "lucide-react";
import PageShell from "../components/PageShell";
import { useCart } from "../components/CartContext";
import { validateCopyTicket } from "../lib/copyTickets";
import { fmtMXN } from "../utils/getItemPrice";
import { useState } from "react";

export default function TicketPage({ openCart }) {
  const { addItem, items } = useCart();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);

  async function validateTicket() {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;
    setLoading(true);
    setError("");
    setTicket(null);
    const result = await validateCopyTicket(normalizedCode);
    setLoading(false);
    if (!result.valid) {
      setError(result.reason || "El código no es válido.");
      return;
    }
    setTicket(result);
  }

  function addTicketToCart() {
    if (!ticket?.code) return;
    const existing = items.find(
      (item) =>
        item.serviceKey === "ticket-cobro" &&
        item.options?.ticketCode === ticket.code
    );
    if (!existing) {
      addItem({
        serviceKey: "ticket-cobro",
        serviceLabel: ticket.servicio || "Ticket de mostrador",
        quantity: 1,
        options: {
          ticketCode: ticket.code,
          ticketTotal: Number(ticket.total) || 0,
          ticketDescription: ticket.descripcion || "Cobro de mostrador",
          ticketQuantity: ticket.cantidad ?? null,
          ticketUnitPrice: ticket.precio_unit ?? null,
        },
      });
    }
    openCart?.({ tab: "pedido" });
  }

  return (
    <PageShell
      path="/ticket"
      eyebrow="Cobro de mostrador"
      title="Consulta y paga tu ticket"
      intro="Escribe el código que te proporcionaron en sucursal para revisar el servicio y agregarlo a tu carrito."
      breadcrumbLabel="Pagar ticket"
    >
      <section className="mx-auto max-w-2xl py-10">
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <label
            htmlFor="ticket-code"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300"
          >
            Código del ticket
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="ticket-code"
              value={code}
              maxLength={10}
              autoComplete="off"
              spellCheck={false}
              placeholder="Ej. ABC123"
              onChange={(event) => {
                setCode(event.target.value.toUpperCase().replace(/\s/g, ""));
                setError("");
                setTicket(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  validateTicket();
                }
              }}
              className="input h-11 flex-1 font-mono uppercase tracking-[0.18em]"
            />
            <button
              type="button"
              onClick={validateTicket}
              disabled={loading || !code.trim()}
              className="btn-blue min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Validando..." : "Consultar ticket"}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {ticket && (
            <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-200">Ticket disponible</p>
                  <p className="mt-1 text-sm text-slate-200">
                    {ticket.servicio || "Servicio de mostrador"}
                  </p>
                  {ticket.descripcion && (
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {ticket.descripcion}
                    </p>
                  )}
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-emerald-400/15 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        Código
                      </p>
                      <p className="font-mono text-sm tracking-[0.16em] text-slate-200">
                        {ticket.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-400/70">
                        Total
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-emerald-300">
                        ${fmtMXN(Number(ticket.total) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={addTicketToCart}
                className="btn-blue mt-4 inline-flex w-full items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Ticket className="h-4 w-4" />
                Agregar ticket al carrito
              </button>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
