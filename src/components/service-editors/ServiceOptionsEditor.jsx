// src/components/service-editors/ServiceOptionsEditor.jsx
import { normalizeServiceKey } from "./normalizeServiceKey";

import PrintOptionsEditor from "./editors/PrintOptionsEditor";
import ArtsOptionsEditor from "./editors/ArtsOptionsEditor";
import ScanOptionsEditor from "./editors/ScanOptionsEditor";
import SublimationOptionsEditor from "./editors/SublimationOptionsEditor";
import StickersOptionsEditor from "./editors/StickersOptionsEditor";
import CopiesOptionsEditor from "./editors/CopiesOptionsEditor";
import PvcOptionsEditor from "./editors/PvcOptionsEditor";
import PinsOptionsEditor from "./editors/PinsOptionsEditor";
import PloteoOptionsEditor from "./editors/PloteoOptionsEditor";
import GenericOptionsEditor from "./editors/GenericOptionsEditor";

export default function ServiceOptionsEditor({ item, onChangeOptions }) {
  if (!item) return null;

  const rawKey = (
    item.serviceKey ||
    item.service?.key ||
    item.serviceName ||
    item.serviceLabel ||
    item.service?.name ||
    ""
  ).toString();

  const key = normalizeServiceKey(rawKey);
  const opts = item.options || {};
  const pageCount = item.pageCount || 1;

  // 👇 Props comunes
  const common = { opts, pageCount, onChangeOptions };

  // Matchers “flexibles”
  const isScan =
    key === "escaneo" ||
    key === "escaneos" ||
    key === "escaneos-y-digitalizacion" ||
    key === "digitalizacion";

  const isStickers =
    key.includes("sticker") ||
    key.includes("stiker") ||
    key.includes("stickers-vinil") ||
    key.includes("etiqueta");

  const isCopies =
    key.includes("copia") ||
    key.includes("copias") ||
    key.includes("engargol") ||
    key.includes("engargolado");

  // ✅ Fotobotones / Pines
  const isPins =
    key === "fotobotones" ||
    key === "fotoboton" ||
    key.includes("fotobot") ||
    key.includes("pin") ||
    key.includes("pines") ||
    key.includes("fotobotones-y-pines") ||
    key.includes("fotobotones-pines");

  const isPloteo =
    key === "ploteo" ||
    key === "planos" ||
    key.includes("ploteo") ||
    key.includes("plotter") ||
    key.includes("gran-formato") ||
    key.includes("gran formato");

  if (key === "impresion") return <PrintOptionsEditor {...common} item={item} />;
  if (key === "artes") return <ArtsOptionsEditor {...common} />;
  if (isScan) return <ScanOptionsEditor {...common} />;
  if (isPloteo) return <PloteoOptionsEditor {...common} item={item} />;
  if (key === "sublimacion") return <SublimationOptionsEditor {...common} />;
  if (isStickers) return <StickersOptionsEditor {...common} />;
  if (isCopies) return <CopiesOptionsEditor {...common} />;
  if (key === "pvc") return <PvcOptionsEditor {...common} />;
  if (isPins) return <PinsOptionsEditor {...common} />;

  return <GenericOptionsEditor {...common} />;
}
