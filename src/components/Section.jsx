export default function Section({ id, label, children }) {
  return (
    <section id={id} className="py-10 md:py-14">
      {label && (
        <h2 className="mb-6 text-white/90 text-xl md:text-2xl font-semibold tracking-wide">
          {label}
        </h2>
      )}
      {children}
    </section>
  );
}
