import artes from "../assets/artes.png";
import digi from "../assets/digi.png";
import engar from "../assets/engar.png";
import pins from "../assets/pins.png";
import planos from "../assets/planos.png";
import pvc from "../assets/pvc.png";
import scan from "../assets/scan.png";
import stickers from "../assets/stickers.png";
import sublimacion from "../assets/sublimacion.png";

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
    id: "copias-engargolados",
    title: "Copias y engargolados",
    tag: "Documentos y oficina",
    description:
      "Copiado nitido, organizacion de juegos, engargolado y acabados para tareas, manuales, informes y presentaciones.",
    details: ["Copias B/N y color", "Engargolado y pastas", "Laminado y enmicado"],
    delivery: "Mismo día, según volumen",
    image: engar,
    alt: "Muestra de copiado y acabados para documentos",
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
];
