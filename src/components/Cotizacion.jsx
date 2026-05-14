// src/components/Cotizacion.jsx
import Section from "./Section";


export default function Cotizacion() {
  return (
    <Section id="cotizacion" label="FORMULARIO DE COTIZACIÓN">
      <form onSubmit={(e) => e.preventDefault()} className="grid md:grid-cols-2 gap-4 bg-white p-6 rounded-2xl border">
        <div>
          <label className="block text-sm font-medium text-ink">Nombre</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Teléfono / WhatsApp</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-ink">Servicio</label>
          <select className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-accent">
            <option>Impresión Digital</option>
            <option>Copias</option>
            <option>Ploteo de Planos</option>
            <option>Artes Gráficas</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-ink">Detalles (tamaño, papel, cantidad, etc.)</label>
          <textarea rows="4" className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <button className="md:col-span-2 rounded-xl bg-primary text-white px-5 py-3 hover:bg-primary/90">
          Enviar solicitud
        </button>
      </form>
    </Section>
  );
}
