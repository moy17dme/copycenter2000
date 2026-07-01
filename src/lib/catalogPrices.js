import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

let rows = [];
let loaded = false;
let loadingPromise = null;
let version = 0;
const listeners = new Set();

const PAPER_TO_CATEGORY = {
  "Bond 75 g": "papel_bond",
  "Bond 90 g": "papel_bond",
  "Opalina 115 g": "papel_opalina",
  "Opalina 225 g": "papel_opalina",
  "Cartulina sulfatada 300 g": "cartulina_sulfatada",
  "Adhesivo mate": "papel_autoadhesivo",
  "Adhesivo brillante": "papel_autoadhesivo",
  "Adhesivo transparente": "papel_autoadhesivo",
  "Acetato": "acetato_transparente",
  "Kromacote 300 g": "brillante_kromacote",
  "Couché 130 g": "brillante_couche",
  "Couché 300 g": "brillante_couche",
  "Couche 130 g": "brillante_couche",
  "Couche 300 g": "brillante_couche",
};

const COLOR_TO_VARIANT = {
  negro: "negro",
  colorLaser: "color_laser",
  colorInkjet: "color_inyeccion_de_tinta",
  color: "color",
};

const FORMAT_TO_SLUG = {
  Carta: "carta",
  Oficio: "oficio",
  "Doble Carta": "doble_carta",
  "13x19": "13x19",
  Servicio: "servicio",
};

function emit() {
  version += 1;
  listeners.forEach((listener) => listener(version));
}

function setRows(nextRows) {
  rows = Array.isArray(nextRows) ? nextRows.filter((row) => row.activo !== false) : [];
  loaded = true;
  emit();
}

export async function loadCatalogPrices({ force = false } = {}) {
  if (loaded && !force) return rows;
  if (loadingPromise && !force) return loadingPromise;

  loadingPromise = supabase
    .from("catalogo_precios")
    .select("*")
    .order("servicio")
    .order("categoria_slug")
    .order("min_cantidad")
    .then(({ data, error }) => {
      if (!error) setRows(data || []);
      return rows;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function subscribeCatalogPrices(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCatalogPricesVersion() {
  return version;
}

export function installCatalogPricesRealtime() {
  loadCatalogPrices();

  const channel = supabase
    .channel("catalog-prices-public")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "catalogo_precios" },
      () => loadCatalogPrices({ force: true })
    )
    .subscribe();

  const onFocus = () => {
    if (document.visibilityState === "visible") loadCatalogPrices({ force: true });
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
    supabase.removeChannel(channel);
  };
}

export function useCatalogPricesVersion() {
  const [currentVersion, setCurrentVersion] = useState(getCatalogPricesVersion());

  useEffect(() => {
    loadCatalogPrices();
    return subscribeCatalogPrices(setCurrentVersion);
  }, []);

  return currentVersion;
}

function findPrice({ servicio, categoria, variante, formato, qty }) {
  const quantity = Math.max(1, Number(qty) || 1);
  const row = rows.find((item) =>
    item.servicio === servicio &&
    item.categoria_slug === categoria &&
    item.variante_slug === variante &&
    item.formato_slug === formato &&
    quantity >= Number(item.min_cantidad || 0) &&
    quantity <= Number(item.max_cantidad || 9_999_999)
  );
  return row ? Number(row.precio) : null;
}

export function lookupCatalogPrintPrice(paper, qty, format, colorKey) {
  const categoria = PAPER_TO_CATEGORY[paper];
  const variante = COLOR_TO_VARIANT[colorKey];
  const formato = FORMAT_TO_SLUG[format];
  if (!categoria || !variante || !formato || rows.length === 0) return null;

  return findPrice({
    servicio: "impresion",
    categoria,
    variante,
    formato,
    qty,
  });
}

export function lookupCatalogBindingPrice(bindType, pages) {
  const variant = /metal/i.test(String(bindType || "")) ? "metalico" : "plastico";
  if (rows.length === 0) return null;

  return findPrice({
    servicio: "engargolado",
    categoria: "engargolado",
    variante: variant,
    formato: "servicio",
    qty: pages,
  });
}
