export default function Section({ id, label, eyebrow, children }) {
  return (
    <section id={id} className="scroll-mt-24 py-8 md:py-10">
      {label && (
        <div className="mb-5 flex items-center gap-3">
          {eyebrow && (
            <span className="rounded-md border border-border bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </span>
          )}
          <h2 className="text-lg font-semibold text-white md:text-xl">{label}</h2>
          <div className="h-px flex-1 bg-border/70" />
        </div>
      )}
      {children}
    </section>
  );
}
