import PageShell from "../components/PageShell";
import MimakiPrices from "../components/MimakiPrices";

export default function UvServicePage() {
  return (
    <PageShell path="/servicios/impresion-uv" eyebrow="Gran formato" title="Impresión UV"
      intro="Consulta materiales, acabados, anchos imprimibles y precios para tu tirada."
      breadcrumbs={[{label:"Servicios",path:"/servicios"},{label:"Impresión UV",path:"/servicios/impresion-uv"}]}>
      <MimakiPrices />
    </PageShell>
  );
}
