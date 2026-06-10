import { FileCheck2, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";

const faqs = [
  {
    question: "¿Cuál es el mejor formato para enviar a impresión?",
    answer:
      "PDF es la opción preferida porque conserva medidas, tipografías y distribución. También se aceptan PNG, JPG, TIFF y formatos de ploteo indicados en el pedido. Convierte archivos de Word, Excel o PowerPoint a PDF antes de enviarlos.",
  },
  {
    question: "¿Qué resolución debe tener mi archivo?",
    answer:
      "Para impresos vistos de cerca, prepara imágenes a 300 DPI en el tamaño final. En gran formato puede bastar una resolución menor según la distancia de lectura; consulta antes de reducir un archivo técnico o fotográfico.",
  },
  {
    question: "¿Debo trabajar en RGB o CMYK?",
    answer:
      "Para impresión comercial conviene preparar el archivo en CMYK. Las pantallas usan RGB y pueden mostrar colores más brillantes de los que una impresora reproduce. Si el color es crítico, solicita una prueba física.",
  },
  {
    question: "¿Cuánto sangrado y margen de seguridad necesito?",
    answer:
      "Agrega 3 mm de sangrado por cada lado cuando el diseño llegue hasta el borde. Mantén textos, logotipos y datos importantes al menos 3 a 5 mm dentro de la línea de corte.",
  },
  {
    question: "¿Cómo evito problemas con las tipografías?",
    answer:
      "Incrusta las fuentes al exportar el PDF o convierte los textos a curvas cuando el programa lo permita. Revisa que acentos, símbolos y saltos de línea se vean correctamente en el PDF final.",
  },
  {
    question: "¿Cómo preparo planos a escala?",
    answer:
      "Exporta el plano a PDF con el tamaño de papel y escala definidos. Indica si debe imprimirse al 100 %, ajustado al papel o en una escala específica. Incluye una referencia medible para poder verificarla.",
  },
  {
    question: "¿Pueden revisar o corregir mi diseño?",
    answer:
      "Se realiza una revisión técnica básica de formato, tamaño y resolución. La corrección de diseño, ortografía, armado o adaptación puede requerir un servicio adicional y siempre debe autorizarse antes de producir.",
  },
  {
    question: "¿Cuándo comienza la producción?",
    answer:
      "El tiempo de producción inicia cuando están confirmados el archivo final, las especificaciones y el pago o comprobante correspondiente. Los plazos cambian según cantidad, material y acabados.",
  },
  {
    question: "¿Qué hago si necesito factura?",
    answer:
      "Solicítala durante el pedido y proporciona los datos fiscales requeridos. Revisa que RFC, razón social, régimen, uso de CFDI y correo sean correctos antes de confirmar.",
  },
  {
    question: "¿Cómo se atiende un defecto o una aclaración?",
    answer:
      "Conserva el producto y comprobante, toma fotografías del problema y contacta a Copy Center 2000 lo antes posible. Se revisará si corresponde corregir, reponer, bonificar o reembolsar.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <PageShell
      path="/preguntas-frecuentes"
      eyebrow="Guía técnica"
      title="Preguntas frecuentes para preparar tus archivos"
      intro="Una buena impresión comienza antes de subir el archivo. Esta guía resume los puntos que más influyen en color, nitidez, corte, escala y tiempo de producción."
      breadcrumbLabel="Preguntas frecuentes"
      structuredData={faqSchema}
      width="max-w-5xl"
    >
      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <h2 className="sr-only">Respuestas frecuentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border bg-card"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-white marker:hidden">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="text-xl font-normal text-blue-300 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="border-t border-border px-5 py-4 text-sm leading-7 text-slate-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-5">
            <FileCheck2 className="h-6 w-6 text-blue-300" />
            <h2 className="mt-4 font-semibold text-white">
              Revisión rápida antes de enviar
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              <li>PDF en tamaño final</li>
              <li>Imágenes a 300 DPI</li>
              <li>Color CMYK cuando aplique</li>
              <li>3 mm de sangrado</li>
              <li>Fuentes incrustadas o en curvas</li>
              <li>Ortografía y datos revisados</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-secondary/35 p-5">
            <Lightbulb className="h-6 w-6 text-amber-300" />
            <h2 className="mt-4 font-semibold text-white">
              La prueba física reduce sorpresas
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Solicítala cuando el color, el tamaño o el acabado sean críticos
              para el resultado.
            </p>
          </div>
        </aside>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-8">
        <MessageCircleQuestion className="h-5 w-5 text-blue-300" />
        <p className="mr-auto text-sm text-slate-300">
          ¿Tu archivo tiene una condición especial?
        </p>
        <Link to="/contacto" className="btn-outline">
          Consultar antes de imprimir
        </Link>
        <Link to="/#servicios" className="btn-blue">
          Iniciar pedido
        </Link>
      </div>
    </PageShell>
  );
}
