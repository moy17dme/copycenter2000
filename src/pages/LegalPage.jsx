import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";

const CONTACT_EMAIL = "copy.center@hotmail.com";
const WHATSAPP_URL = "https://wa.me/527713531668";
const LAST_UPDATED = "23 de junio de 2026";

const privacySections = [
  {
    title: "1. Identidad y domicilio del responsable",
    content: (
      <>
        <p>
          Copy Center 2000, nombre comercial con domicilio en Calle Gral. Vicente
          Segura 301-A, colonia Periodistas, C.P. 42060, Pachuca de Soto, Hidalgo,
          es responsable del tratamiento de los datos personales recabados a
          través de este sitio, WhatsApp, correo electrónico y atención en
          sucursal.
        </p>
        <p>
          Copy Center 2000 cuenta con una renovación de licencia de
          funcionamiento emitida por la Secretaría de Desarrollo Económico de
          Pachuca de Soto el 6 de febrero de 2026, con vigencia hasta el 31 de
          diciembre de 2026. El documento original no se publica porque contiene
          datos personales y elementos de seguridad. Para consultas fiscales o
          de facturación, contáctanos directamente al correo indicado con el
          asunto "Facturación".
        </p>
      </>
    ),
  },
  {
    title: "2. Datos personales que podemos recabar",
    content: (
      <>
        <p>Dependiendo del servicio solicitado, podemos tratar:</p>
        <ul>
          <li>Nombre, correo electrónico, teléfono y datos de contacto.</li>
          <li>Datos de cuenta, autenticación e historial de pedidos.</li>
          <li>
            Archivos, imágenes, documentos, instrucciones y especificaciones
            que nos proporciones para imprimir o producir tu pedido.
          </li>
          <li>
            Datos fiscales, como RFC, razón social, correo de facturación y
            Constancia de Situación Fiscal, cuando solicites factura.
          </li>
          <li>
            Referencias de pago, estado de la transacción y comprobantes. Copy
            Center 2000 no almacena los datos completos de tu tarjeta; el pago
            electrónico es procesado y tokenizado por Mercado Pago.
          </li>
          <li>
            Datos técnicos y de sesión que generen el sitio y sus proveedores,
            como dirección IP, navegador, dispositivo, registros de acceso y
            cookies necesarias.
          </li>
        </ul>
        <p>
          No solicitamos datos personales sensibles de manera intencional. Si
          tus archivos contienen este tipo de información, debes asegurarte de
          contar con autorización para compartirla y limitarla a lo estrictamente
          necesario para el servicio.
        </p>
      </>
    ),
  },
  {
    title: "3. Finalidades del tratamiento",
    content: (
      <>
        <p>Usamos tus datos para finalidades necesarias, entre ellas:</p>
        <ul>
          <li>Crear tu cuenta, autenticarte y brindarte soporte.</li>
          <li>Cotizar, registrar, producir, entregar y dar seguimiento a pedidos.</li>
          <li>Contactarte por correo, teléfono o WhatsApp sobre tu solicitud.</li>
          <li>Procesar pagos, validar comprobantes y prevenir operaciones indebidas.</li>
          <li>Emitir facturas y cumplir obligaciones fiscales, contables y legales.</li>
          <li>Atender aclaraciones, cancelaciones, garantías y reclamaciones.</li>
          <li>Proteger la seguridad y funcionamiento del sitio.</li>
        </ul>
        <p>
          No utilizaremos tus datos para publicidad o promociones sin tu
          consentimiento. Puedes solicitar en cualquier momento dejar de recibir
          comunicaciones no indispensables para tu pedido.
        </p>
      </>
    ),
  },
  {
    title: "4. Proveedores y transferencias",
    content: (
      <p>
        Podemos compartir los datos indispensables con proveedores que apoyan
        la operación del sitio, como Supabase para autenticación, base de datos y
        almacenamiento; Mercado Pago para pagos; servicios de mensajería y
        WhatsApp cuando decidas comunicarte por ese medio; así como autoridades
        cuando exista una obligación legal. Estos proveedores tratan la
        información conforme a sus propios avisos y medidas de seguridad, y
        algunos pueden operar fuera de México.
      </p>
    ),
  },
  {
    title: "5. Conservación, retención de archivos y seguridad",
    content: (
      <>
        <p>
          Conservaremos la información durante el tiempo necesario para prestar
          el servicio, atender responsabilidades derivadas de la relación y
          cumplir obligaciones legales. Después será bloqueada o eliminada
          conforme corresponda.
        </p>
        <p>
          <strong style={{ color: "#e2e8f0" }}>Archivos de diseño e impresión:</strong>{" "}
          Los archivos que subas para producir tu pedido se conservan en el
          almacenamiento del sitio durante un plazo máximo de 90 días naturales
          después de la entrega, únicamente para facilitar la reimpresión o
          aclaración de pedidos. Transcurrido ese plazo, los archivos se eliminan
          de forma automática salvo que hayas solicitado expresamente su
          eliminación anticipada o su conservación para reimpresión futura.
        </p>
        <p>
          Si tu proyecto contiene información confidencial, te recomendamos
          solicitarnos la eliminación inmediata una vez entregado el pedido
          escribiendo a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
          con el asunto "Eliminar archivos · Pedido #[número]".
        </p>
        <p>
          Aplicamos medidas administrativas, técnicas y físicas razonables,
          incluido el cifrado HTTPS del sitio y el uso de proveedores con sus
          propias certificaciones de seguridad. Sin embargo, ningún sistema
          conectado a internet puede garantizar seguridad absoluta.
        </p>
      </>
    ),
  },
  {
    title: "6. Derechos ARCO y revocación",
    content: (
      <>
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición
          respecto de tus datos, así como revocar tu consentimiento o limitar su
          uso. Envía tu solicitud a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> con el asunto
          “Derechos ARCO”.
        </p>
        <p>
          Incluye tu nombre, un medio para recibir respuesta, una descripción
          clara de la solicitud, los datos relacionados y un documento que
          permita acreditar tu identidad o representación. Responderemos dentro
          de los plazos previstos por la legislación aplicable.
        </p>
      </>
    ),
  },
  {
    title: "7. Cookies y tecnologías similares",
    content: (
      <p>
        El sitio puede utilizar almacenamiento local, cookies técnicas y
        tecnologías equivalentes para mantener tu sesión, conservar el carrito,
        reforzar la seguridad y habilitar funciones esenciales. Puedes
        administrarlas desde tu navegador, aunque bloquearlas puede afectar el
        funcionamiento de la cuenta, el carrito o el pago.
      </p>
    ),
  },
  {
    title: "8. Cambios al aviso",
    content: (
      <p>
        Las modificaciones se publicarán en esta misma dirección con la fecha de
        actualización correspondiente. Cuando un cambio requiera consentimiento
        adicional, lo solicitaremos por un medio adecuado antes de aplicar la
        nueva finalidad.
      </p>
    ),
  },
];

const termsSections = [
  {
    title: "1. Aceptación y alcance",
    content: (
      <>
        <p>
          Al navegar por el sitio, crear una cuenta o confirmar un pedido aceptas
          estos términos. Copy Center 2000 presta servicios de impresión digital,
          copiado, ploteo, acabados, artes gráficas, sublimación y productos
          personalizados. Las condiciones específicas mostradas en la cotización o
          resumen de compra forman parte del acuerdo.
        </p>
        <p>
          Para crear una cuenta se requiere una aceptación electrónica expresa de
          estos términos y del aviso de privacidad. El sitio podrá conservar la
          fecha, hora, versión aceptada, cuenta y datos técnicos necesarios para
          acreditar dicha aceptación.
        </p>
      </>
    ),
  },
  {
    title: "2. Cotizaciones, precios y disponibilidad",
    content: (
      <>
        <p>
          Los precios se expresan en pesos mexicanos. Antes de confirmar se
          mostrará el total calculable, incluidos descuentos y cargos aplicables.
          Algunos trabajos especiales pueden aparecer “por cotizar”; en esos
          casos te contactaremos para confirmar precio, materiales, tiempo y
          alcance antes de cobrar o producir.
        </p>
        <p>
          Una cotización puede ajustarse si el archivo, cantidad, medida,
          material o acabado real no coincide con la información proporcionada.
          Te informaremos del cambio para que decidas si deseas continuar.
        </p>
      </>
    ),
  },
  {
    title: "3. Archivos y autorización de uso",
    content: (
      <>
        <p>
          Eres responsable de revisar el contenido, ortografía, medidas,
          resolución, márgenes, orientación, tipografías y versión final de los
          archivos que envías. También declaras contar con los derechos o
          permisos necesarios para reproducirlos.
        </p>
        <p>
          Cada vez que adjuntes archivos para un pedido, especialmente PDFs u
          otros documentos de impresión, deberás confirmar una declaración de
          responsabilidad. Esa aceptación podrá generar un anexo electrónico por
          archivo con tu nombre, cuenta, nombre del archivo, ruta interna,
          tamaño, hash técnico y versión de estos términos.
        </p>
        <p>
          No aceptamos contenido ilícito, fraudulento, que vulnere derechos de
          terceros o cuya reproducción esté prohibida. Podemos rechazar o
          suspender un pedido cuando exista una razón fundada para considerar que
          incumple esta regla.
        </p>
      </>
    ),
  },
  {
    title: "4. Color, corte y acabados",
    content: (
      <p>
        Las pantallas muestran colores en RGB y los equipos de impresión trabajan
        con otros perfiles, por lo que pueden existir variaciones razonables de
        color, brillo, textura, corte o posición. Cuando la coincidencia sea
        crítica, solicita una prueba física antes de autorizar la producción
        completa. Estas variaciones no eliminan tu derecho a reclamar defectos
        atribuibles al servicio.
      </p>
    ),
  },
  {
    title: "5. Pago y confirmación",
    content: (
      <p>
        Los medios disponibles son transferencia bancaria y pago electrónico
        mediante Mercado Pago. El pedido entra a producción cuando el pago o
        comprobante haya sido confirmado y, en su caso, cuando se hayan definido
        las especificaciones pendientes. Mercado Pago procesa la transacción bajo
        sus propios términos y controles de seguridad.
      </p>
    ),
  },
  {
    title: "6. Producción y entrega",
    content: (
      <p>
        Los tiempos informados son estimaciones y comienzan después de confirmar
        pago, archivos y especificaciones. La entrega ordinaria se realiza en la
        sucursal indicada en este sitio, salvo que se acuerde expresamente otro
        medio. Te notificaremos cuando el pedido esté listo o si surge una
        incidencia que modifique el plazo.
      </p>
    ),
  },
  {
    title: "7. Cancelaciones y reembolsos",
    content: (
      <>
        <p>
          Puedes cancelar desde “Mis pedidos” mientras el pedido se encuentre
          pendiente de pago. Si necesitas cancelar después, contáctanos de
          inmediato. Debido a que muchos productos se elaboran conforme a tus
          especificaciones, una vez iniciada la producción la cancelación puede
          no ser posible o puede descontar materiales y trabajo ya realizados.
        </p>
        <p>
          Cuando proceda un reembolso, se realizará preferentemente por el mismo
          medio de pago. Los tiempos de acreditación pueden depender de la
          institución bancaria o plataforma. Nada de lo anterior limita los
          derechos irrenunciables que te correspondan como consumidor.
        </p>
      </>
    ),
  },
  {
    title: "8. Garantía de calidad y aclaraciones",
    content: (
      <>
        <p>
          <strong style={{ color: "#e2e8f0" }}>Garantía de satisfacción:</strong>{" "}
          Si el resultado presenta un defecto atribuible a Copy Center 2000
          —error de impresión, corte incorrecto, material equivocado u otro
          problema originado en nuestra producción— lo corregimos sin costo.
          Comunícate tan pronto lo detectes, conserva el producto y el
          comprobante de pago.
        </p>
        <p>
          Dependiendo del caso y a criterio del equipo, la solución puede ser:
          reimpresión prioritaria, bonificación parcial o reembolso completo por
          el mismo medio de pago utilizado.
        </p>
        <p>
          Los errores presentes en el archivo autorizado por el cliente
          (ortografía, medidas, colores, resolución insuficiente), o cambios
          solicitados después de iniciar la producción, no se consideran defectos
          atribuibles al servicio y pueden generar un nuevo cargo.
        </p>
        <p>
          Para iniciar una aclaración escribe a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> o contáctanos
          por <a href={WHATSAPP_URL}>WhatsApp</a> con el número de pedido, una
          descripción del problema y fotografías del resultado si es posible.
        </p>
      </>
    ),
  },
  {
    title: "9. Cuenta y comunicaciones",
    content: (
      <p>
        Debes proporcionar datos correctos, mantener seguras tus credenciales y
        notificarnos cualquier uso no autorizado. Podremos enviarte mensajes
        necesarios para confirmar pagos, archivos, cambios, facturación y estado
        del pedido. Las comunicaciones promocionales requerirán consentimiento
        cuando resulte aplicable.
      </p>
    ),
  },
  {
    title: "10. Disponibilidad del sitio y terceros",
    content: (
      <p>
        Podemos realizar mantenimiento, corregir errores o actualizar funciones.
        Los servicios de terceros, como Mercado Pago, Supabase, Facebook,
        Instagram o WhatsApp, se rigen también por sus propias condiciones. No
        controlamos la disponibilidad permanente de esas plataformas.
      </p>
    ),
  },
  {
    title: "11. Propiedad intelectual",
    content: (
      <p>
        El diseño, marca, textos, gráficos y código propio del sitio pertenecen a
        Copy Center 2000 o se utilizan con autorización. No se concede permiso
        para copiarlos, explotarlos o presentarlos como propios fuera del uso
        normal del servicio.
      </p>
    ),
  },
  {
    title: "12. Ley aplicable y contacto",
    content: (
      <p>
        Estos términos se interpretan conforme a las leyes de México. Para
        aclaraciones puedes escribir a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, enviar un
        mensaje por <a href={WHATSAPP_URL}>WhatsApp</a> o acudir al domicilio
        indicado. Conservas en todo momento el derecho de acudir ante la
        Procuraduría Federal del Consumidor u otra autoridad competente.
      </p>
    ),
  },
];

const pageCopy = {
  privacy: {
    eyebrow: "Protección de datos",
    title: "Aviso de privacidad",
    intro:
      "Te explicamos qué información tratamos, para qué la utilizamos y cómo puedes ejercer tus derechos.",
    sections: privacySections,
  },
  terms: {
    eyebrow: "Condiciones del servicio",
    title: "Términos y condiciones",
    intro:
      "Estas reglas buscan que cada pedido tenga especificaciones, costos y responsabilidades claras desde el inicio.",
    sections: termsSections,
  },
};

export default function LegalPage({ type }) {
  const page = pageCopy[type] || pageCopy.terms;
  const path = type === "privacy" ? "/aviso-privacidad" : "/terminos";
  const breadcrumbs = [{ label: page.title, path }];

  return (
    <main className="relative z-10 flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <Seo path={path} breadcrumbs={breadcrumbs} />
      <article className="mx-auto max-w-4xl">
        <nav aria-label="Migas de pan" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition hover:text-white">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </li>
            <li aria-current="page" className="text-slate-300">
              {page.title}
            </li>
          </ol>
        </nav>

        <header className="border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            {page.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {page.intro}
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Última actualización: {LAST_UPDATED}
          </p>
        </header>

        <div className="divide-y divide-border">
          {page.sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="text-xl font-semibold text-foreground">
                {section.title}
              </h2>
              <div className="legal-copy mt-3 space-y-4 text-[15px] leading-7 text-slate-300">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/5 p-5">
          <p className="text-sm leading-6 text-slate-300">
            Este documento describe la operación actual del sitio. Para una
            validación contractual, fiscal o regulatoria específica del negocio,
            se recomienda revisión profesional.
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn-blue">
            Volver al inicio
          </Link>
          <Link
            to={type === "privacy" ? "/terminos" : "/aviso-privacidad"}
            className="btn-outline"
          >
            {type === "privacy"
              ? "Ver términos y condiciones"
              : "Ver aviso de privacidad"}
          </Link>
        </div>
      </article>
    </main>
  );
}
