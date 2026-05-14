// src/components/GoogleReviews.jsx
export default function GoogleReviews() {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-white mb-4">
        Opiniones de nuestros clientes
      </h2>
      <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <iframe
          src="https://share.google/TxtXLqp0niOcQEmEP"
          width="100%"
          height="400"
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
          title="Opiniones de Google"
        ></iframe>
      </div>
    </section>
  );
}
