// src/components/CartOverlay/ServiceOptionsRouter.jsx
import PrintOptionsEditor from "./options/PrintOptionsEditor";
import ArtesOptionsEditor from "./options/ArtesOptionsEditor";
import ScanOptionsEditor from "./options/ScanOptionsEditor";
import PlanosOptionsEditor from "./options/PlanosOptionsEditor";
import SublimacionOptionsEditor from "./options/SublimacionOptionsEditor";
import StickersOptionsEditor from "./options/StickersOptionsEditor";
import CopiasEngargoladosOptionsEditor from "./options/CopiasEngargoladosOptionsEditor";
import PvcOptionsEditor from "./options/PvcOptionsEditor";
import GenericOptionsEditor from "./options/GenericOptionsEditor";

function normalizeKey(rawKey = "") {
  return rawKey
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function ServiceOptionsRouter({ item, onChangeOptions }) {
  if (!item) return null;

  const rawKey =
    item.serviceKey || item.service?.key || item.serviceName || "";

  const key = normalizeKey(rawKey);
  const options = item.options || {};
  const pageCount = item.pageCount || 1;

  const finishes = options.finishes || {};
  const lam = finishes.laminado || {};
  const enm = finishes.enmicado || {};
  const eng = finishes.engargolado || {};
  const extras = finishes.extras || {};

  const update = (patch) => {
    onChangeOptions({
      ...patch,
    });
  };

  const updateFinishes = (patch) => {
    onChangeOptions({
      finishes: {
        laminado: lam,
        enmicado: enm,
        engargolado: eng,
        extras,
        ...patch,
      },
    });
  };

  // Router por tipo de servicio
  if (key.includes("impresion") || key.includes("digital")) {
    return (
      <PrintOptionsEditor
        options={options}
        pageCount={pageCount}
        update={update}
        updateFinishes={updateFinishes}
      />
    );
  }

  if (key.includes("arte") || key.includes("diseno")) {
    return <ArtesOptionsEditor options={options} update={update} />;
  }

  if (
    key.includes("escaneo") ||
    key.includes("escaneos") ||
    key.includes("digitalizacion")
  ) {
    return <ScanOptionsEditor options={options} update={update} />;
  }

  if (key.includes("plano") || key.includes("planos") || key.includes("ploteo")) {
    return <PlanosOptionsEditor options={options} update={update} />;
  }

  if (key.includes("sublim")) {
    return <SublimacionOptionsEditor options={options} update={update} />;
  }

  if (
    key.includes("sticker") ||
    key.includes("stiker") ||
    key.includes("etiqueta")
  ) {
    return <StickersOptionsEditor options={options} update={update} />;
  }

  if (key.includes("copia") || key.includes("engargol")) {
    return (
      <CopiasEngargoladosOptionsEditor
        options={options}
        update={update}
      />
    );
  }

  if (key.includes("pvc") || key.includes("credencial")) {
    return <PvcOptionsEditor options={options} update={update} />;
  }

  // Fallback
  return <GenericOptionsEditor options={options} update={update} />;
}

export default ServiceOptionsRouter;
