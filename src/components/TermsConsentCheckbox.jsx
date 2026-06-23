export default function TermsConsentCheckbox({
  checked,
  onChange,
  disabled = false,
  compact = false,
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-500 bg-slate-950 text-orange-500 focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed"
      />
      <span className={compact ? "text-[11px] leading-5 text-slate-300" : "text-xs leading-5 text-slate-300"}>
        Acepto los{" "}
        <a
          href="/terminos"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-orange-300 hover:text-orange-200"
        >
          terminos y condiciones
        </a>{" "}
        y el{" "}
        <a
          href="/aviso-privacidad"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-orange-300 hover:text-orange-200"
        >
          aviso de privacidad
        </a>
        . Entiendo que mi aceptacion queda registrada para crear la cuenta.
      </span>
    </label>
  );
}
