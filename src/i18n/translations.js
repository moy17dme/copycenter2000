export const DEFAULT_LOCALE = "es";

export const LOCALE_CONFIG = {
  es: {
    label: "Español",
    shortLabel: "ES",
    htmlLang: "es-MX",
    currency: "MXN",
    country: "MX",
  },
  en: {
    label: "English",
    shortLabel: "EN",
    htmlLang: "en-US",
    currency: "USD",
    country: "US",
  },
};

export const SUPPORTED_LOCALES = Object.keys(LOCALE_CONFIG);

const SPANISH_LANGUAGE_COUNTRIES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "ES",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
  "VE",
]);

export function matchSupportedLocale(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("es")) return "es";
  return SUPPORTED_LOCALES.includes(raw) ? raw : null;
}

export function normalizeLocale(value) {
  return matchSupportedLocale(value) || DEFAULT_LOCALE;
}

export function getLocaleForCountry(countryCode) {
  const country = String(countryCode || "").trim().toUpperCase();
  if (country === "US" || country === "CA" || country === "GB") return "en";
  if (SPANISH_LANGUAGE_COUNTRIES.has(country)) return "es";
  return DEFAULT_LOCALE;
}

export function getLocaleForNavigator(language) {
  return matchSupportedLocale(language || "") || DEFAULT_LOCALE;
}

export const messages = {
  es: {
    nav: {
      home: "Inicio",
      services: "Servicios",
      prices: "Precios",
      contact: "Contacto",
      portfolio: "Portafolio",
      resources: "Recursos",
      more: "Más",
      payTicket: "Pagar ticket",
      signIn: "Ingresar",
      admin: "Admin",
      myOrders: "Mis pedidos",
      myAccount: "Mi cuenta",
      signOut: "Salir",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      openCart: "Abrir carrito",
      cart: "Carrito",
    },
    locale: {
      switcherLabel: "Cambiar idioma",
      spanish: "Español",
      english: "English",
    },
    hero: {
      badge: "Copy Center 2000 - Pachuca",
      title: "Sube tus archivos y haz tu pedido de impresión en minutos",
      description:
        "Copias, ploteo de planos, stickers, tarjetas PVC y artes gráficas. Elige el servicio, adjunta tu archivo y confirma el pedido sin vueltas.",
      chips: ["PDF e imágenes", "Precios de referencia", "Atención por WhatsApp"],
      order: "Realizar pedido",
      prices: "Ver precios",
      stats: [
        { label: "Servicios", value: "9+" },
        { label: "Lun-Vie", value: "8:00-19:30" },
        { label: "Sábado", value: "9:00-15:00" },
      ],
    },
    footer: {
      ctaTitle: "¿Listo para imprimir?",
      ctaText: "Sube tus archivos y realiza tu pedido en segundos.",
      ctaOrder: "¡Realiza tu pedido!",
      ctaPrices: "Ver precios",
      about:
        "Impresiones digitales, ploteo de planos y artes gráficas con calidad y rapidez.",
      servicesHeading: "Servicios",
      linksHeading: "Enlaces",
      contactHeading: "Contacto",
      services: {
        digitalPrint: "Impresión Digital",
        copies: "Copias B/N y Color",
        binding: "Engargolados",
        plans: "Ploteo de Planos",
        graphics: "Artes Gráficas",
        scanning: "Escaneo y Digitalización",
        documents: "Actas y constancias",
      },
      links: {
        home: "Inicio",
        services: "Servicios",
        prices: "Precios",
        about: "Acerca de",
        portfolio: "Portafolio",
        resources: "Recursos de impresión",
        faq: "Preguntas frecuentes",
        contact: "Contacto",
        privacy: "Aviso de privacidad",
        terms: "Términos y condiciones",
      },
      address:
        "Calle Gral. Vicente Segura 301-A, col. Periodistas, 42060 Pachuca de Soto, Hidalgo",
      hours: "Lun-vie: 8:00-19:30 · Sáb: 9:00-15:00",
      securePayment: "Pago seguro · Mercado Pago",
      googleRating: "{rating} / 5 en Google · {count} opiniones",
      https: "Sitio con HTTPS",
      since: "Negocio establecido desde 1999",
      rights: "Copy Center 2000. Todos los derechos reservados.",
      madeIn: "Hecho en México",
    },
    seo: {
      home: {
        title: "Copy Center 2000 - Impresiones Digitales en Pachuca",
        description:
          "Impresiones digitales, copias, engargolados, actas, constancias fiscales, ploteo, stickers y más en Pachuca de Soto, Hidalgo.",
      },
      services: {
        title: "Servicios de impresión en Pachuca | Copy Center 2000",
        description:
          "Conoce los servicios de impresión, copias, engargolados, actas, constancias fiscales, ploteo, stickers y digitalización en Pachuca.",
      },
      prices: {
        title: "Precios de impresión en Pachuca | Copy Center 2000",
        description:
          "Consulta precios de referencia para copias, impresión a color, ploteo, stickers, tarjetas PVC, sublimación y otros servicios.",
      },
      contact: {
        title: "Contacto y ubicación | Copy Center 2000 Pachuca",
        description:
          "Contacta a Copy Center 2000, solicita una cotización y consulta el mapa, teléfono, WhatsApp, correo y horarios en Pachuca.",
      },
    },
    pageShell: {
      breadcrumbs: "Migas de pan",
      home: "Inicio",
    },
    homeServices: {
      title: "Servicios",
      intro:
        "Sube tus archivos por servicio, configura cómo lo quieres y agrégalo al carrito.",
      activeCount: "{count} servicios activos",
      searchPlaceholder:
        "Busca un servicio: copias, engargolados, actas, constancia...",
      clearSearch: "Limpiar búsqueda",
      found: "Encontrado: {name}",
      notFound: "No se encontró ningún servicio con ese término",
      unavailable: "Temporalmente no disponible",
      choose: "Elegir servicio",
      unavailableShort: "No disponible",
      volumeDiscount: "Desc. por volumen",
      dialogTitle: "Configurar {service}",
      dialogDescription:
        "Selecciona las opciones del servicio y agrega tu pedido al carrito.",
      closeConfig: "Cerrar configuración de {service}",
      selectedService: "Servicio seleccionado",
      designQuestion:
        "¿Tu diseño ya está listo o necesitas apoyo para desarrollarlo?",
      fileReady: "Sí, ya tengo mi archivo listo",
      needDesign: "No, necesito que me ayuden con el diseño",
      processingHint:
        "Leyendo el archivo para calcular páginas y medidas. Esto puede tardar si el PDF es pesado.",
      service: "Servicio",
      loadingOptions: "Cargando opciones...",
      unitPrice: "Por unidad",
      estimatedTotal: "Total estimado",
      completeToSeePrice: "Completa tamaño y cantidad para ver el precio",
      addToCart: "Agregar al carrito",
      addAndUpload: "Agregar y subir mi archivo de diseño",
      uploadFiles: "Sube tus archivos",
      filesFor: "Archivos para {service}",
      uploadIntro:
        "Adjunta tus archivos. Cada archivo se agregará como un elemento independiente en tu carrito.",
      dropProcessing: "Procesando {current} de {total}",
      dropActive: "Suelta aquí tus archivos",
      dropIdle: "Arrastra tus archivos aquí",
      fileReading: "Leyendo archivo...",
      clickToSelect: "o haz clic para seleccionar",
      fileTypes: "PDF, PNG o JPG/JPEG (máximo 25 MB)",
      close: "Cerrar",
      physicalOriginals:
        "Este servicio trabaja con tus originales físicos. Agrégalo al carrito y ajusta las opciones antes de confirmar.",
      confirmOrder: "Confirmar pedido →",
      cancel: "Cancelar",
      whatsappDesignHelp:
        "Hola, me interesa el servicio de \"{service}\" y necesito ayuda con el diseño.",
      fileProcessError:
        "No se pudo procesar el archivo. Intenta de nuevo o conviértelo a PDF.",
    },
    servicesPage: {
      eyebrow: "Impresión, acabados y trámites",
      title: "Servicios para imprimir, presentar y resolver lo que necesitas",
      intro:
        "Desde copias y engargolados hasta proyectos en gran formato, actas y constancias. Revisa los requisitos y configura el servicio desde el sistema de pedidos.",
      breadcrumb: "Servicios",
      catalogLabel: "Catálogo de servicios",
      deliveryLabel: "Entrega estimada:",
      configure: "Configurar servicio",
      asideTitle: "¿No encuentras exactamente lo que necesitas?",
      asideText:
        "Los materiales, medidas y acabados pueden combinarse según el proyecto. Comparte cantidad, tamaño, fecha de entrega y archivo para recibir una cotización precisa.",
      asideNote:
        "Los tiempos son orientativos y comienzan al confirmar archivo, pago y especificaciones. La cantidad, disponibilidad de material y acabados pueden modificar la fecha final.",
      startOrder: "Iniciar pedido",
      requestHelp: "Solicitar orientación",
    },
    pricesPage: {
      eyebrow: "Costos claros",
      title: "Precios de referencia para tus impresiones",
      intro:
        "Compara rangos por servicio y cantidad. El total final depende del archivo, medida, material, acabado y tiempo de producción.",
      breadcrumb: "Precios",
      beforeTitle: "Antes de confirmar el precio",
      beforeText:
        "Revisa resolución, tamaño final, cantidad y acabado. Para proyectos especiales, solicita una cotización antes de enviar el pago.",
      configure: "Configurar pedido",
      prepareFiles: "Preparar mis archivos",
    },
    pricesList: {
      title: "Precios de referencia",
      intro:
        "Precios aproximados de referencia. El total estimado se confirma al configurar tu pedido.",
      includedTax: "Precios de referencia · IVA incluido",
      from: "desde",
      order: "Hacer pedido",
      showLess: "Ver menos servicios",
      showMore: "Ver los {count} servicios restantes",
      customQuote:
        "¿Tienes un proyecto especial? Escríbenos por WhatsApp para una cotización personalizada.",
    },
  },
  en: {
    nav: {
      home: "Home",
      services: "Services",
      prices: "Pricing",
      contact: "Contact",
      portfolio: "Portfolio",
      resources: "Resources",
      more: "More",
      payTicket: "Pay ticket",
      signIn: "Sign in",
      admin: "Admin",
      myOrders: "My orders",
      myAccount: "My account",
      signOut: "Sign out",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      openCart: "Open cart",
      cart: "Cart",
    },
    locale: {
      switcherLabel: "Change language",
      spanish: "Español",
      english: "English",
    },
    hero: {
      badge: "Copy Center 2000 - Pachuca",
      title: "Upload your files and place a print order in minutes",
      description:
        "Copies, blueprint plotting, stickers, PVC cards and business print materials. Choose a service, attach your file and confirm your order without back-and-forth.",
      chips: ["PDF and images", "Reference pricing", "WhatsApp support"],
      order: "Start an order",
      prices: "See pricing",
      stats: [
        { label: "Services", value: "9+" },
        { label: "Mon-Fri", value: "8:00-19:30" },
        { label: "Saturday", value: "9:00-15:00" },
      ],
    },
    footer: {
      ctaTitle: "Ready to print?",
      ctaText: "Upload your files and place your order in seconds.",
      ctaOrder: "Start your order",
      ctaPrices: "See pricing",
      about:
        "Digital printing, blueprint plotting and graphic print services with speed and care.",
      servicesHeading: "Services",
      linksHeading: "Links",
      contactHeading: "Contact",
      services: {
        digitalPrint: "Digital Printing",
        copies: "B/W and Color Copies",
        binding: "Binding",
        plans: "Blueprint Plotting",
        graphics: "Business Prints",
        scanning: "Scanning and Digitization",
        documents: "Certificates and tax documents",
      },
      links: {
        home: "Home",
        services: "Services",
        prices: "Pricing",
        about: "About",
        portfolio: "Portfolio",
        resources: "Print resources",
        faq: "FAQ",
        contact: "Contact",
        privacy: "Privacy notice",
        terms: "Terms and conditions",
      },
      address:
        "Calle Gral. Vicente Segura 301-A, Periodistas, 42060 Pachuca de Soto, Hidalgo, Mexico",
      hours: "Mon-Fri: 8:00-19:30 · Sat: 9:00-15:00",
      securePayment: "Secure payment · Mercado Pago",
      googleRating: "{rating} / 5 on Google · {count} reviews",
      https: "HTTPS secured site",
      since: "Established business since 1999",
      rights: "Copy Center 2000. All rights reserved.",
      madeIn: "Made in Mexico",
    },
    seo: {
      home: {
        title: "Copy Center 2000 - Digital Printing in Pachuca, Mexico",
        description:
          "Digital printing, copies, binding, official documents, blueprint plotting, stickers and more in Pachuca de Soto, Hidalgo, Mexico.",
      },
      services: {
        title: "Print services in Pachuca | Copy Center 2000",
        description:
          "Explore printing, copies, binding, official documents, blueprint plotting, stickers and scanning services in Pachuca.",
      },
      prices: {
        title: "Printing prices in Pachuca | Copy Center 2000",
        description:
          "Review reference pricing for copies, color printing, blueprint plotting, stickers, PVC cards, sublimation and more.",
      },
      contact: {
        title: "Contact and location | Copy Center 2000 Pachuca",
        description:
          "Contact Copy Center 2000, request a quote and find our map, phone, WhatsApp, email and opening hours in Pachuca.",
      },
    },
    pageShell: {
      breadcrumbs: "Breadcrumbs",
      home: "Home",
    },
    homeServices: {
      title: "Services",
      intro:
        "Upload files by service, configure what you need and add it to your cart.",
      activeCount: "{count} active services",
      searchPlaceholder:
        "Search services: copies, binding, certificates, tax documents...",
      clearSearch: "Clear search",
      found: "Found: {name}",
      notFound: "No service matched that search",
      unavailable: "Temporarily unavailable",
      choose: "Choose service",
      unavailableShort: "Unavailable",
      volumeDiscount: "Volume discount",
      dialogTitle: "Configure {service}",
      dialogDescription: "Select service options and add your order to the cart.",
      closeConfig: "Close {service} configuration",
      selectedService: "Selected service",
      designQuestion: "Is your design ready or do you need help preparing it?",
      fileReady: "Yes, my file is ready",
      needDesign: "No, I need design help",
      processingHint:
        "Reading the file to calculate pages and dimensions. Large PDFs can take a moment.",
      service: "Service",
      loadingOptions: "Loading options...",
      unitPrice: "Unit price",
      estimatedTotal: "Estimated total",
      completeToSeePrice: "Complete size and quantity to see the price",
      addToCart: "Add to cart",
      addAndUpload: "Add and upload my design file",
      uploadFiles: "Upload your files",
      filesFor: "Files for {service}",
      uploadIntro:
        "Attach your files. Each file will be added as a separate item in your cart.",
      dropProcessing: "Processing {current} of {total}",
      dropActive: "Drop your files here",
      dropIdle: "Drag your files here",
      fileReading: "Reading file...",
      clickToSelect: "or click to select",
      fileTypes: "PDF, PNG or JPG/JPEG (25 MB max)",
      close: "Close",
      physicalOriginals:
        "This service works from your physical originals. Add it to the cart and adjust options before confirming.",
      confirmOrder: "Confirm order →",
      cancel: "Cancel",
      whatsappDesignHelp:
        "Hi, I am interested in \"{service}\" and need help with the design.",
      fileProcessError:
        "We could not process the file. Try again or convert it to PDF.",
    },
    servicesPage: {
      eyebrow: "Printing, finishing and document services",
      title: "Services for printing, presenting and getting things done",
      intro:
        "From copies and binding to large-format projects, certificates and tax documents. Review the requirements and configure your service from the ordering system.",
      breadcrumb: "Services",
      catalogLabel: "Service catalog",
      deliveryLabel: "Estimated delivery:",
      configure: "Configure service",
      asideTitle: "Do not see exactly what you need?",
      asideText:
        "Materials, sizes and finishes can be combined depending on the project. Share quantity, size, delivery date and file details to receive a precise quote.",
      asideNote:
        "Timing is approximate and begins after file, payment and specifications are confirmed. Quantity, material availability and finishes can change the final date.",
      startOrder: "Start order",
      requestHelp: "Request guidance",
    },
    pricesPage: {
      eyebrow: "Clear costs",
      title: "Reference pricing for your prints",
      intro:
        "Compare ranges by service and quantity. Final totals depend on file, size, material, finish and production timing.",
      breadcrumb: "Pricing",
      beforeTitle: "Before confirming the price",
      beforeText:
        "Check resolution, final size, quantity and finish. For special projects, request a quote before sending payment.",
      configure: "Configure order",
      prepareFiles: "Prepare my files",
    },
    pricesList: {
      title: "Reference pricing",
      intro:
        "Approximate reference prices. The estimated total is confirmed when you configure your order.",
      includedTax: "Reference pricing · VAT included",
      from: "from",
      order: "Place order",
      showLess: "Show fewer services",
      showMore: "Show the remaining {count} services",
      customQuote:
        "Have a special project? Message us on WhatsApp for a custom quote.",
    },
  },
};

function readPath(object, path) {
  return String(path || "")
    .split(".")
    .reduce((current, segment) => current?.[segment], object);
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function translate(locale, key, params = {}, fallback = "") {
  const normalized = normalizeLocale(locale);
  const value = readPath(messages[normalized], key) ?? readPath(messages[DEFAULT_LOCALE], key);
  if (value === undefined || value === null) return fallback || key;
  if (typeof value !== "string") return value;
  return interpolate(value, params);
}
