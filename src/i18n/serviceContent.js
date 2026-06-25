const SERVICE_TRANSLATIONS = {
  en: {
    impresion: {
      nombre: "Digital Printing",
      tag: "FULL COLOR / B/W",
      descripcion:
        "From a single piece with no minimum. Color and B/W on bond, coated, opaline and more. Ideal for short runs or variable-data files.",
      desde_precio: "From $0.60 MXN/piece",
    },
    copias: {
      nombre: "Copies",
      tag: "OFFICE",
      descripcion:
        "Fast, sharp black-and-white or color copies, single or double-sided.",
      desde_precio: "From $0.70 MXN/copy",
    },
    engargolado: {
      nombre: "Binding",
      tag: "FINISHING",
      descripcion:
        "Metal or plastic binding for assignments, manuals, reports and presentations.",
      desde_precio: "From $22 MXN",
    },
    ploteo: {
      nombre: "Large-format printing",
      tag: "LARGE FORMAT",
      descripcion:
        "Blueprint plotting on bond, opaline, photo paper, canvas, banner and vinyl. Priced by linear meter.",
      desde_precio: "Quote by m2",
    },
    artes: {
      nombre: "Business Prints",
      tag: "OFFSET · THOUSANDS",
      descripcion:
        "Offset runs by the thousand with the same design. Coated 115g/150g/300g, bond and adhesive paper. Better cost for larger runs.",
      desde_precio: "From $315 MXN/thousand",
    },
    stickers: {
      nombre: "Stickers",
      tag: "VINYL",
      descripcion:
        "Round, square or contour-cut stickers. Matte or glossy vinyl.",
      desde_precio: "Quote",
    },
    pvc: {
      nombre: "PVC Cards",
      tag: "CREDENTIALS",
      descripcion:
        "Plastic cards, credentials, QR codes, folios and more.",
      desde_precio: "From $18 MXN/card",
    },
    sublimacion: {
      nombre: "Sublimation",
      tag: "CUSTOM PRODUCTS",
      descripcion:
        "Mugs, tumblers, shirts, cushions and more with your design.",
      desde_precio: "From $30 MXN/piece",
    },
    fotobotones: {
      nombre: "Photo Buttons and Pins",
      tag: "PROMOTIONAL",
      descripcion:
        "Custom pins and photo buttons with your photo or logo.",
      desde_precio: "From $9 MXN/piece",
    },
    escaneo: {
      nombre: "Scanning and Digitization",
      tag: "DIGITAL",
      descripcion:
        "Document and blueprint scanning, PDF/JPG output and email delivery.",
      desde_precio: "From $0.40 MXN/page",
    },
    actas: {
      nombre: "Official Certificates",
      tag: "DOCUMENTS",
      descripcion:
        "Birth, marriage or death certificates. Choose the type and provide the required information.",
      desde_precio: "$85 MXN",
    },
    "constancia-situacion-fiscal": {
      nombre: "Mexican Tax Status Certificate",
      tag: "SAT",
      descripcion:
        "Get your certificate by providing RFC and CIF ID.",
      desde_precio: "$120 MXN",
    },
  },
};

const QTY_BADGE_TRANSLATIONS = {
  en: {
    impresion: "FROM 1 PIECE",
    artes: "MIN. 1,000 PCS",
  },
};

export function localizeCatalogService(service, locale = "es") {
  const key = service?.id || service?.serviceKey;
  const translation = SERVICE_TRANSLATIONS[locale]?.[key];
  if (!translation) return service;

  return {
    ...service,
    ...translation,
  };
}

export function getLocalizedQtyBadgeLabel(serviceKey, locale = "es", fallback = "") {
  return QTY_BADGE_TRANSLATIONS[locale]?.[serviceKey] || fallback;
}
