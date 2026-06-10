import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";

const articlePath = "/recursos/como-preparar-archivos-para-imprimir";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Cómo preparar archivos para imprimir",
  description:
    "Guía para preparar PDF, resolución, color CMYK, sangrado, tipografías y tamaño final antes de imprimir.",
  datePublished: "2026-06-10",
  dateModified: "2026-06-10",
  inLanguage: "es-MX",
  mainEntityOfPage: `https://copycenter2000.com${articlePath}`,
  author: {
    "@type": "Organization",
    name: "Copy Center 2000",
    url: "https://copycenter2000.com/acerca-de",
    description: "Centro de impresión con más de 26 años de experiencia en preprensa y producción gráfica en Pachuca, Hidalgo.",
  },
  publisher: {
    "@id": "https://copycenter2000.com/#localbusiness",
  },
};

const checklist = [
  "Tamaño final y orientación correctos",
  "PDF de impresión revisado página por página",
  "Imágenes a 300 DPI para lectura cercana",
  "Color CMYK cuando el proyecto lo requiera",
  "3 mm de sangrado en diseños a borde",
  "Textos importantes a 3 o 5 mm del corte",
  "Fuentes incrustadas o convertidas a curvas",
  "Ortografía, folios, teléfonos y fechas confirmados",
];

export default function PrintFileGuidePage() {
  return (
    <PageShell
      path={articlePath}
      eyebrow="Guía de preprensa"
      title="Cómo preparar archivos para imprimir"
      intro="Una revisión de diez minutos puede evitar cambios de color, textos sustituidos, bordes blancos y medidas incorrectas."
      breadcrumbs={[
        { label: "Recursos", path: "/recursos" },
        { label: "Preparar archivos", path: articlePath },
      ]}
      structuredData={articleSchema}
      width="max-w-5xl"
    >
      <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="resource-copy min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Elaborado por el equipo técnico de{" "}
              <strong className="font-medium text-slate-300">Copy Center 2000</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>Más de 26 años en preprensa y producción gráfica</span>
            <span aria-hidden="true">·</span>
            <span>Actualizado el 10 de junio de 2026</span>
          </div>

          <section id="formato">
            <h2>1. Define tamaño y formato antes de diseñar</h2>
            <p>
              Crea el documento con la medida final del producto. No conviene
              diseñar en carta y ampliar después a doble carta, lona o plano,
              porque imágenes, líneas y textos pueden perder calidad.
            </p>
            <p>
              El formato recomendado para entregar es PDF. Exportarlo como PDF
              de impresión ayuda a conservar la composición y permite revisar
              exactamente las páginas que se producirán.
            </p>
          </section>

          <section id="resolucion">
            <h2>2. Usa la resolución adecuada</h2>
            <p>
              Para tarjetas, volantes, fotografías y documentos vistos de cerca,
              prepara las imágenes a 300 DPI en el tamaño final. Una imagen
              pequeña tomada de internet no gana detalle al cambiar únicamente
              el número de DPI.
            </p>
            <p>
              En lonas y piezas grandes, la resolución puede ser menor porque se
              observan a mayor distancia. Confirma la medida y distancia de
              lectura antes de reducir un archivo.
            </p>
          </section>

          <section id="color">
            <h2>3. Prepara el color para impresión</h2>
            <p>
              Las pantallas trabajan con luz RGB; la impresión reproduce color
              con tintas o tóner. Para trabajos comerciales, prepara el archivo
              en CMYK y evita confiar únicamente en cómo se ve desde un teléfono.
            </p>
            <p>
              Cuando el color de marca sea crítico, solicita una prueba física.
              Adobe también recomienda PDF de impresión y permite exportar con
              perfil CMYK para mejorar la previsibilidad del resultado.
            </p>
          </section>

          <section id="sangrado">
            <h2>4. Añade sangrado y margen de seguridad</h2>
            <p>
              Si una fotografía o fondo llega hasta el borde, extiéndelo 3 mm
              fuera de la medida final por cada lado. Ese excedente se elimina
              durante el corte y evita líneas blancas.
            </p>
            <p>
              Mantén textos, logotipos, códigos QR y datos importantes al menos
              3 a 5 mm dentro del corte. Las marcas de corte no sustituyen el
              sangrado.
            </p>
          </section>

          <section id="fuentes">
            <h2>5. Incrusta las fuentes y revisa el texto</h2>
            <p>
              Al exportar, incrusta las tipografías o conviértelas a curvas si
              el programa y la licencia lo permiten. Esto reduce sustituciones
              que cambian saltos de línea, pesos o símbolos.
            </p>
            <p>
              Abre el PDF final en otro dispositivo y revisa acentos, números,
              teléfonos, fechas y ortografía. La revisión técnica no reemplaza
              la autorización del contenido.
            </p>
          </section>

          <section id="planos">
            <h2>6. Para planos, indica escala y tamaño de papel</h2>
            <p>
              Exporta a PDF con una referencia medible e indica si debe salir al
              100 %, ajustado al papel o en una escala específica. Evita enviar
              una captura de pantalla del plano.
            </p>
          </section>

          <section id="entrega">
            <h2>7. Nombra y entrega archivos sin ambigüedad</h2>
            <p>
              Usa nombres como <strong>volante-frente-final.pdf</strong> y
              <strong> volante-vuelta-final.pdf</strong>. Elimina versiones
              antiguas de la carpeta y especifica cantidad, material, acabado y
              fecha requerida.
            </p>
          </section>

          <aside className="mt-10 rounded-xl border border-blue-400/20 bg-blue-500/5 p-6">
            <FileCheck2 className="h-6 w-6 text-blue-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Fuentes técnicas consultadas
            </h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm">
              <SourceLink href="https://helpx.adobe.com/express/web/print-and-export/export-pdfs-with-cmyk-color-profile.html">
                Adobe: exportar PDF de impresión en CMYK
              </SourceLink>
              <SourceLink href="https://helpx.adobe.com/illustrator/using/printers-marks-bleeds.html">
                Adobe Illustrator: marcas y sangrado
              </SourceLink>
              <SourceLink href="https://helpx.adobe.com/acrobat/desktop/create-documents/explore-advanced-conversion-settings/font-handling-distiller.html">
                Adobe Acrobat: incrustación de fuentes
              </SourceLink>
            </div>
          </aside>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-white">
              Checklist antes de enviar
            </h2>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-6 text-slate-300"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-5">
            <Download className="h-5 w-5 text-blue-300" />
            <h2 className="mt-3 font-semibold text-white">
              ¿Listo para producir?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Adjunta el PDF final y configura medida, cantidad y acabado.
            </p>
            <Link to="/#servicios" className="btn-blue mt-4 w-full justify-center">
              Iniciar pedido
            </Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function SourceLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 font-semibold text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
    >
      {children}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}
