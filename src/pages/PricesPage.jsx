import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import Precios from "../components/Precios";

export default function PricesPage() {
  return (
    <PageShell
      path="/precios"
      eyebrow="Costos claros"
      title="Precios de referencia para tus impresiones"
      intro="Compara rangos por servicio y cantidad. El total final depende del archivo, medida, material, acabado y tiempo de producción."
      breadcrumbLabel="Precios"
    >
      <section className="py-10">
        <Precios />
      </section>

      <aside className="rounded-xl border border-border bg-secondary/35 p-6">
        <h2 className="text-lg font-semibold text-white">
          Antes de confirmar el precio
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Revisa resolución, tamaño final, cantidad y acabado. Para proyectos
          especiales, solicita una cotización antes de enviar el pago.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/#servicios" className="btn-blue">
            Configurar pedido
          </Link>
          <Link to="/preguntas-frecuentes" className="btn-outline">
            Preparar mis archivos
          </Link>
        </div>
      </aside>
    </PageShell>
  );
}
