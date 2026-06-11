export const SITE_URL = "https://copycenter2000.com";

export function getCanonicalUrl(path = "/") {
  const normalizedPath =
    path === "/" ? "/" : `${path.replace(/^\/+|\/+$/g, "")}/`;
  return new URL(normalizedPath, SITE_URL).href;
}

export const PUBLIC_ROUTE_SEO = {
  "/": {
    title: "Copy Center 2000 - Impresiones Digitales en Pachuca",
    description:
      "Impresiones digitales, copias, ploteo de planos, artes gráficas, stickers, sublimación y más en Pachuca de Soto, Hidalgo.",
  },
  "/servicios": {
    title: "Servicios de impresión en Pachuca | Copy Center 2000",
    description:
      "Conoce los servicios de impresión digital, copiado, ploteo, stickers, tarjetas PVC, sublimación y digitalización en Pachuca.",
  },
  "/precios": {
    title: "Precios de impresión en Pachuca | Copy Center 2000",
    description:
      "Consulta precios de referencia para copias, impresión a color, ploteo, stickers, tarjetas PVC, sublimación y otros servicios.",
  },
  "/acerca-de": {
    title: "Acerca de Copy Center 2000 | Imprenta en Pachuca",
    description:
      "Conoce la historia de Copy Center 2000, fundado el 4 de octubre de 1999, su equipo y más de 26 años de experiencia en Pachuca.",
  },
  "/preguntas-frecuentes": {
    title: "Preguntas frecuentes de impresión | Copy Center 2000",
    description:
      "Aprende a preparar archivos para impresión: PDF, resolución, color CMYK, sangrado, tipografías, tamaños y entrega de pedidos.",
  },
  "/contacto": {
    title: "Contacto y ubicación | Copy Center 2000 Pachuca",
    description:
      "Contacta a Copy Center 2000, solicita una cotización y consulta el mapa, teléfono, WhatsApp, correo y horarios en Pachuca.",
  },
  "/portafolio": {
    title: "Portafolio de impresión | Copy Center 2000 Pachuca",
    description:
      "Explora muestras visuales de impresión digital, ploteo, stickers, sublimación, credenciales, acabados y digitalización.",
  },
  "/recursos": {
    title: "Recursos y guías de impresión | Copy Center 2000",
    description:
      "Consulta guías de impresión para preparar archivos, elegir resolución, color, sangrado, tipografías y formatos antes de producir.",
  },
  "/recursos/como-preparar-archivos-para-imprimir": {
    title: "Cómo preparar archivos para imprimir | Copy Center 2000",
    description:
      "Guía práctica para preparar PDF, imágenes a 300 DPI, color CMYK, sangrado, fuentes y medidas antes de enviar un archivo a impresión.",
  },
  "/aviso-privacidad": {
    title: "Aviso de privacidad | Copy Center 2000",
    description:
      "Consulta cómo Copy Center 2000 recaba, utiliza, protege y conserva tus datos personales y cómo ejercer tus derechos ARCO.",
  },
  "/terminos": {
    title: "Términos y condiciones | Copy Center 2000",
    description:
      "Consulta condiciones de compra, archivos, pagos, producción, entregas, cancelaciones, devoluciones y garantías.",
  },
};
