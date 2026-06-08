export function normalizeTicketServiceText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export function getTicketServiceKey(item) {
  return normalizeTicketServiceText(
    item?.serviceKey ||
      item?.service?.key ||
      item?.serviceName ||
      item?.serviceLabel ||
      item?.service?.name ||
      ""
  );
}

export function isTicketRequiredItem(item) {
  const raw = getTicketServiceKey(item);
  return (
    raw.includes("copia") ||
    raw.includes("engargol") ||
    raw.includes("escaneo") ||
    raw.includes("digitaliz")
  );
}
