import artes from "../assets/artes.webp";
import digi from "../assets/digi.webp";
import engar from "../assets/engar.webp";
import pins from "../assets/pins.webp";
import planos from "../assets/planos.webp";
import pvc from "../assets/pvc.webp";
import scan from "../assets/scan.webp";
import stickers from "../assets/stickers.webp";
import sublimacion from "../assets/sublimacion.webp";

export const PUBLIC_SERVICES = [
  {
    id: "impresion-digital",
    title: "Impresion digital",
    tag: "Color y blanco y negro",
    description:
      "Impresiones desde una pieza en papel bond, couche, opalina y otros materiales para documentos, presentaciones y promocionales.",
    details: ["Archivos PDF o imagen", "Carta, oficio y formatos especiales", "Impresion a una o dos caras"],
    delivery: "30 minutos a 1 día hábil",
    image: digi,
    alt: "Equipo y muestras de impresion digital",
  },
  {
    id: "copias",
    title: "Copias",
    tag: "Documentos y oficina",
    description:
      "Copias nitidas en blanco y negro o color para tareas, expedientes, manuales y presentaciones.",
    details: ["Blanco y negro o color", "Carta, oficio y doble carta", "Una o dos caras"],
    delivery: "Mismo día, según volumen",
    image: engar,
    alt: "Copias de documentos listas para entrega",
  },
  {
    id: "engargolados",
    title: "Engargolados",
    tag: "Acabados",
    description:
      "Presentacion y proteccion de tareas, manuales, informes y documentos con arillo y pastas.",
    details: ["Arillo metalico o plastico", "Pastas y respaldos", "Desde $22"],
    delivery: "Mismo día, según volumen",
    image: engar,
    alt: "Documentos con engargolado y pastas",
  },
  {
    id: "ploteo-planos",
    title: "Ploteo de planos",
    tag: "Gran formato",
    description:
      "Impresion de planos arquitectonicos, ingenieria, mapas y laminas en diferentes anchos, papeles y escalas.",
    details: ["Bond, opalina y fotografico", "Blanco y negro o color", "Doblado o entrega enrollada"],
    delivery: "1 a 2 días hábiles",
    image: planos,
    alt: "Plotter y planos impresos en gran formato",
  },
  {
    id: "impresos-comerciales",
    title: "Impresos comerciales",
    tag: "Difusion y ventas",
    description:
      "Volantes, tripticos, tarjetas, menus y materiales para comunicar promociones, servicios y eventos.",
    details: ["Tirajes cortos o por millar", "Papeles y gramajes variados", "Corte, doblez y perforado"],
    delivery: "3 a 7 días hábiles",
    image: artes,
    alt: "Muestras de impresos comerciales y artes graficas",
  },
  {
    id: "stickers",
    title: "Stickers personalizados",
    tag: "Vinil y etiquetas",
    description:
      "Etiquetas y stickers redondos, cuadrados o con corte de contorno para empaques, identidad y promocion.",
    details: ["Vinil mate o brillante", "Corte individual o en hoja", "Laminado opcional"],
    delivery: "2 a 4 días hábiles",
    image: stickers,
    alt: "Proceso de corte de stickers personalizados",
  },
  {
    id: "tarjetas-pvc",
    title: "Tarjetas PVC",
    tag: "Credenciales",
    description:
      "Credenciales, membresias y tarjetas plasticas personalizadas con datos variables, codigos QR o folios.",
    details: ["Formato estandar CR80", "Impresion por uno o ambos lados", "Datos variables disponibles"],
    delivery: "2 a 5 días hábiles",
    image: pvc,
    alt: "Tarjetas PVC y credenciales personalizadas",
  },
  {
    id: "sublimacion",
    title: "Sublimacion",
    tag: "Productos personalizados",
    description:
      "Personalizacion de tazas, termos, textiles y promocionales con fotografias, logotipos o ilustraciones.",
    details: ["Pedidos individuales o por volumen", "Revision previa del diseno", "Opciones para regalos y eventos"],
    delivery: "2 a 5 días hábiles",
    image: sublimacion,
    alt: "Productos ilustrativos para personalizacion por sublimacion",
  },
  {
    id: "fotobotones-pines",
    title: "Fotobotones y pines",
    tag: "Promocionales",
    description:
      "Pines y fotobotones para eventos, equipos, marcas, escuelas y campanas con diferentes diametros.",
    details: ["Imagen, logo o mensaje", "Varias medidas", "Pedidos por cantidad"],
    delivery: "2 a 4 días hábiles",
    image: pins,
    alt: "Muestras ilustrativas de pines y fotobotones",
  },
  {
    id: "digitalizacion",
    title: "Escaneo y digitalizacion",
    tag: "Archivo digital",
    description:
      "Conversion de documentos, fotografias y planos a archivos digitales organizados para consulta, respaldo o envio.",
    details: ["PDF, JPG o TIFF", "Resolucion de 300 a 600 DPI", "Entrega digital acordada"],
    delivery: "Mismo día o 1 a 2 días por volumen",
    image: scan,
    alt: "Proceso ilustrativo de escaneo y digitalizacion",
  },
  {
    id: "actas",
    title: "Actas",
    tag: "Trámites",
    description:
      "Solicita actas de nacimiento, matrimonio o defunción por $85. Elige el tipo al configurar el servicio.",
    details: ["Precio fijo de $85", "Nacimiento: una CURP", "Matrimonio: las dos CURP de la pareja"],
    delivery: "Sujeto a disponibilidad del sistema",
    image: scan,
    alt: "Servicio de solicitud de actas",
  },
  {
    id: "constancia-situacion-fiscal",
    title: "Constancia de situación fiscal",
    tag: "SAT",
    description:
      "Obtén tu constancia de situación fiscal por $120 proporcionando RFC e ID de CIF.",
    details: ["Precio fijo de $120", "Requisitos: RFC e ID de CIF", "Solicitud desde el sistema de pedidos"],
    delivery: "Sujeto a disponibilidad del sistema",
    image: scan,
    alt: "Servicio de obtención de constancia de situación fiscal",
  },
];

const PUBLIC_SERVICE_ORDER = [
  "impresion-digital",
  "copias",
  "engargolados",
  "actas",
  "constancia-situacion-fiscal",
  "ploteo-planos",
  "impresos-comerciales",
  "stickers",
  "tarjetas-pvc",
  "sublimacion",
  "fotobotones-pines",
  "digitalizacion",
];

PUBLIC_SERVICES.sort(
  (a, b) => PUBLIC_SERVICE_ORDER.indexOf(a.id) - PUBLIC_SERVICE_ORDER.indexOf(b.id)
);

const PUBLIC_SERVICE_TRANSLATIONS = {
  en: {
    "impresion-digital": {
      title: "Digital printing",
      tag: "Color and black-and-white",
      description:
        "Print from a single piece on bond, coated, opaline and other papers for documents, presentations and promotional materials.",
      details: ["PDF or image files", "Letter, legal and custom formats", "Single or double-sided printing"],
      delivery: "30 minutes to 1 business day",
      alt: "Digital printing equipment and print samples",
    },
    copias: {
      title: "Copies",
      tag: "Documents and office",
      description:
        "Sharp black-and-white or color copies for schoolwork, records, manuals and presentations.",
      details: ["Black-and-white or color", "Letter, legal and tabloid", "Single or double-sided"],
      delivery: "Same day, depending on volume",
      alt: "Copied documents ready for pickup",
    },
    engargolados: {
      title: "Binding",
      tag: "Finishing",
      description:
        "Present and protect assignments, manuals, reports and documents with coils and covers.",
      details: ["Metal or plastic coil", "Covers and backs", "From $22 MXN"],
      delivery: "Same day, depending on volume",
      alt: "Bound documents with covers",
    },
    "ploteo-planos": {
      title: "Blueprint plotting",
      tag: "Large format",
      description:
        "Print architectural plans, engineering drawings, maps and boards in different widths, papers and scales.",
      details: ["Bond, opaline and photo paper", "Black-and-white or color", "Folded or rolled delivery"],
      delivery: "1 to 2 business days",
      alt: "Plotter and large-format printed plans",
    },
    "impresos-comerciales": {
      title: "Business prints",
      tag: "Promotion and sales",
      description:
        "Flyers, brochures, business cards, menus and materials for promotions, services and events.",
      details: ["Short runs or thousands", "Various papers and weights", "Cutting, folding and perforation"],
      delivery: "3 to 7 business days",
      alt: "Business print samples and graphic arts",
    },
    stickers: {
      title: "Custom stickers",
      tag: "Vinyl and labels",
      description:
        "Round, square or contour-cut labels and stickers for packaging, identity and promotion.",
      details: ["Matte or glossy vinyl", "Individual cut or sheet", "Optional lamination"],
      delivery: "2 to 4 business days",
      alt: "Custom sticker cutting process",
    },
    "tarjetas-pvc": {
      title: "PVC cards",
      tag: "Credentials",
      description:
        "Custom credentials, memberships and plastic cards with variable data, QR codes or folios.",
      details: ["Standard CR80 format", "One or two-sided printing", "Variable data available"],
      delivery: "2 to 5 business days",
      alt: "Custom PVC cards and credentials",
    },
    sublimacion: {
      title: "Sublimation",
      tag: "Custom products",
      description:
        "Customize mugs, tumblers, textiles and promotional products with photos, logos or illustrations.",
      details: ["Single items or volume orders", "Design review before production", "Gift and event options"],
      delivery: "2 to 5 business days",
      alt: "Products for sublimation customization",
    },
    "fotobotones-pines": {
      title: "Photo buttons and pins",
      tag: "Promotional",
      description:
        "Pins and photo buttons for events, teams, brands, schools and campaigns in different diameters.",
      details: ["Image, logo or message", "Several sizes", "Quantity pricing"],
      delivery: "2 to 4 business days",
      alt: "Samples of pins and photo buttons",
    },
    digitalizacion: {
      title: "Scanning and digitization",
      tag: "Digital archive",
      description:
        "Convert documents, photographs and plans into organized digital files for consultation, backup or delivery.",
      details: ["PDF, JPG or TIFF", "300 to 600 DPI resolution", "Digital delivery by agreement"],
      delivery: "Same day or 1 to 2 days by volume",
      alt: "Illustrative scanning and digitization process",
    },
    actas: {
      title: "Official certificates",
      tag: "Documents",
      description:
        "Request birth, marriage or death certificates for $85 MXN. Choose the type when configuring the service.",
      details: ["Fixed price of $85 MXN", "Birth certificate: one CURP", "Marriage certificate: both CURPs"],
      delivery: "Subject to system availability",
      alt: "Official certificate request service",
    },
    "constancia-situacion-fiscal": {
      title: "Mexican tax status certificate",
      tag: "SAT",
      description:
        "Get your Mexican tax status certificate for $120 MXN by providing RFC and CIF ID.",
      details: ["Fixed price of $120 MXN", "Requirements: RFC and CIF ID", "Request from the ordering system"],
      delivery: "Subject to system availability",
      alt: "Mexican tax status certificate service",
    },
  },
};

export function getPublicServices(locale = "es") {
  const translations = PUBLIC_SERVICE_TRANSLATIONS[locale];
  if (!translations) return PUBLIC_SERVICES;

  return PUBLIC_SERVICES.map((service) => ({
    ...service,
    ...(translations[service.id] || {}),
  }));
}
