export const GOOGLE_BUSINESS_PROFILE = {
  href: "https://www.google.com/maps/?cid=14514007548682504090",
  rating: 4.5,
  reviewCount: 54,
  checkedAt: "2026-06-10",
};

export const MUNICIPAL_RECORD = {
  year: 2026,
  label: "Licencia de funcionamiento vigente durante 2026",
  issuer: "Secretaría de Desarrollo Económico de Pachuca de Soto",
  issuedAt: "2026-02-06",
  validThrough: "2026-12-31",
  description:
    "Renovación municipal emitida el 6 de febrero de 2026 para el establecimiento Copy Center 2000, vigente hasta el 31 de diciembre de 2026.",
  privacyNote:
    "El documento original fue revisado, pero no se publica porque contiene datos personales, folios, códigos de verificación y firma digital.",
};

export const HISTORICAL_MUNICIPAL_RECORD = {
  href: "https://datos.pachuca.gob.mx/sipot/27/PDFS/Licencias_Funcionamiento_2018.pdf",
  year: 2018,
  label: "Registro municipal histórico de 2018",
};

// Los perfiles institucionales permiten acreditar experiencia sin exponer
// nombres, fotografías ni otros datos personales del equipo.
export const TEAM_PROFILES = [
  {
    id: "fundacion-operacion",
    category: "Dirección y operación",
    publicName: "Perfil institucional de la fundación",
    role: "Responsable de la evolución operativa de Copy Center 2000",
    experience: "Más de 26 años en servicios de copiado e impresión",
    specialties: [
      "ploteo de planos por volumen y doblado",
      "producción de manuales para escuelas",
      "artes gráficas",
      "productos personalizados",
    ],
    bio:
      "Inició Copy Center 2000 en Pachuca el 4 de octubre de 1999 como centro de copiado. Posteriormente incorporó la impresión de planos y amplió la operación hacia las artes gráficas y los productos personalizados.",
    privacyNote:
      "Por seguridad, este perfil se presenta de forma institucional y no publica nombre, fotografía ni datos personales.",
  },
];

// Agregar solo trabajos fotografiados por Copy Center 2000 o con permiso de uso.
// Campos: id, title, service, date, material, process, result, description,
// image, imageAlt, clientName (opcional), clientUrl (opcional).
export const PORTFOLIO_CASES = [];

// Agregar solo testimonios con texto exacto y consentimiento verificable.
// Campos: id, author, date, text, source, href, consentConfirmed.
export const TESTIMONIALS = [];

export const AUTHORITY_LINKS = [
  {
    label: "Perfil de Empresa en Google",
    description: "Ubicación, horarios y opiniones publicadas en Google Maps.",
    href: GOOGLE_BUSINESS_PROFILE.href,
  },
  {
    label: "Página de Copy Center 2000 en Facebook",
    description: "Presencia social externa del negocio.",
    href: "https://www.facebook.com/p/Copy-Center-2000-100056493007838/",
  },
  {
    label: MUNICIPAL_RECORD.label,
    description: `${MUNICIPAL_RECORD.description} ${MUNICIPAL_RECORD.privacyNote}`,
  },
  {
    label: HISTORICAL_MUNICIPAL_RECORD.label,
    description:
      "Documento público del municipio de Pachuca que permite contrastar la presencia histórica del negocio.",
    href: HISTORICAL_MUNICIPAL_RECORD.href,
  },
];
