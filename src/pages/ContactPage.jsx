import { useState } from "react";
import { BadgeCheck, Clock3, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { GOOGLE_BUSINESS_PROFILE } from "../data/trustEvidence";

const WHATSAPP_NUMBER = "527713531668";
const MAPS_URL = "https://www.google.com/maps/?cid=14514007548682504090";
const MAP_EMBED_URL =
  "https://www.google.com/maps?q=Copy+Center+2000,+Calle+Gral.+Vicente+Segura+301-A,+Pachuca+de+Soto,+Hidalgo&output=embed";

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contacto de Copy Center 2000",
  url: "https://copycenter2000.com/contacto/",
  mainEntity: {
    "@id": "https://copycenter2000.com/#localbusiness",
  },
};

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = [
      "Hola, quiero solicitar información en Copy Center 2000.",
      `Nombre: ${data.get("name")}`,
      `Contacto: ${data.get("contact")}`,
      `Servicio: ${data.get("service")}`,
      `Mensaje: ${data.get("message")}`,
    ].join("\n");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setSent(true);
  }

  return (
    <PageShell
      path="/contacto"
      eyebrow="Hablemos de tu proyecto"
      title="Contacto, cotizaciones y ubicación"
      intro="Comparte qué necesitas, cuántas piezas, medidas y fecha estimada. El formulario prepara tu solicitud y abre WhatsApp para continuar la atención."
      breadcrumbLabel="Contacto"
      structuredData={contactSchema}
    >
      {/* Trust bar */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            icon: Star,
            text: `${GOOGLE_BUSINESS_PROFILE.rating} / 5 en Google · ${GOOGLE_BUSINESS_PROFILE.reviewCount} opiniones publicadas`,
          },
          { icon: BadgeCheck, text: "Negocio establecido desde 1999 en Pachuca" },
          { icon: ShieldCheck, text: "Pago seguro con Mercado Pago · HTTPS" },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-xs text-slate-300"
          >
            <Icon className="h-4 w-4 shrink-0 text-blue-300" />
            {text}
          </div>
        ))}
      </div>
      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Solicitar información
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No se envían datos a un servidor desde este formulario. Al terminar
            se abrirá WhatsApp con el mensaje listo para revisar y enviar.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="contact-name" className="label">
                Nombre
              </label>
              <input
                id="contact-name"
                name="name"
                className="input"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="contact-detail" className="label">
                Teléfono o correo
              </label>
              <input
                id="contact-detail"
                name="contact"
                className="input"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="contact-service" className="label">
                Servicio
              </label>
              <select
                id="contact-service"
                name="service"
                className="select"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
                <option>Impresión digital o copias</option>
                <option>Ploteo de planos</option>
                <option>Stickers o etiquetas</option>
                <option>Tarjetas PVC o credenciales</option>
                <option>Sublimación o promocionales</option>
                <option>Escaneo o digitalización</option>
                <option>Otro proyecto</option>
              </select>
            </div>

            <div>
              <label htmlFor="contact-message" className="label">
                Detalles del proyecto
              </label>
              <textarea
                id="contact-message"
                name="message"
                className="input min-h-32 resize-y"
                placeholder="Cantidad, tamaño, material, acabado y fecha de entrega."
                required
              />
            </div>

            <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-border bg-input"
              />
              <span>
                He leído el{" "}
                <Link
                  to="/aviso-privacidad"
                  className="font-semibold text-blue-300 underline underline-offset-4"
                >
                  aviso de privacidad
                </Link>
                .
              </span>
            </label>

            <button type="submit" className="btn-blue">
              <MessageCircle className="h-4 w-4" />
              Continuar en WhatsApp
            </button>
            <p aria-live="polite" className="text-sm text-emerald-300">
              {sent ? "La solicitud se preparó en una nueva ventana." : ""}
            </p>
          </form>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <iframe
              src={MAP_EMBED_URL}
              title="Mapa de Copy Center 2000 en Pachuca"
              className="h-[360px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="p-5">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-300 underline decoration-blue-300/40 underline-offset-4"
              >
                Abrir ubicación en Google Maps
              </a>
            </div>
          </div>

          <address className="grid gap-3 not-italic sm:grid-cols-2">
            <ContactItem icon={MapPin} title="Dirección">
              Calle Gral. Vicente Segura 301-A, col. Periodistas, C.P. 42060,
              Pachuca de Soto, Hidalgo.
            </ContactItem>
            <ContactItem icon={Clock3} title="Horario">
              Lun-vie 8:00-19:30
              <br />
              Sábado 9:00-15:00
            </ContactItem>
            <ContactItem icon={Phone} title="Teléfono">
              <a href="tel:+527717195613">771 719 5613</a>
            </ContactItem>
            <ContactItem icon={Mail} title="Correo">
              <a href="mailto:copy.center@hotmail.com">
                copy.center@hotmail.com
              </a>
            </ContactItem>
          </address>
        </div>
      </section>
    </PageShell>
  );
}

function ContactItem({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-5">
      <Icon className="h-5 w-5 text-blue-300" />
      <h2 className="mt-3 text-sm font-semibold text-white">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-muted-foreground [&_a]:text-blue-300 [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </div>
  );
}
