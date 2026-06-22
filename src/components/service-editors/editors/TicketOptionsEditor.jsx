import { Ticket } from "lucide-react";

export default function TicketOptionsEditor({ opts = {} }) {
  const total = Number(opts.ticketTotal) || 0;

  return (
    <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
            Ticket de mostrador
          </p>
          <p className="mt-2 font-mono text-sm tracking-[0.16em] text-slate-100">
            {opts.ticketCode || "Sin código"}
          </p>
          {opts.ticketDescription && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {opts.ticketDescription}
            </p>
          )}
          <p className="mt-3 text-xl font-bold tabular-nums text-emerald-300">
            ${total.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
