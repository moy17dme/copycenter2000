// src/components/CartOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { useCart } from "./CartContext";
import { cadBulkDiscountPct, cadNextTier, totalCadBondQty } from "../utils/cadDiscount";
import PdfPreview from "./PdfPreview";
import PinCircularPreview from "./PinCircularPreview";
import { getItemPrice, fmtMXN } from "../utils/getItemPrice";
import { useCatalogPricesVersion } from "../lib/catalogPrices";
import ServiceOptionsEditor from "./service-editors/ServiceOptionsEditor";
import CheckoutModal from "./CheckoutModal";

export default function CartOverlay({
  open,
  onClose,
  // Opcionales (no rompen nada si no los usas)
  initialTab = "editar",
  focusItemId = null,
  autoCheckout = false,
  user,
  session,
  profile,
}) {
  const cartApi = useCart();
  const catalogPricesVersion = useCatalogPricesVersion();

  // ── useState primero (reglas de hooks) ────────────────────
  const [tab, setTab]                           = useState("pedido");
  const [activeKey, setActiveKey]               = useState(null);
  const [checkoutOpen, setCheckoutOpen]         = useState(false);
  const [editHinted, setEditHinted]             = useState(false);

  const items      = cartApi.items || [];
  const removeItem = cartApi.removeItem;
  const clearCart  = cartApi.clearCart;

  const getItemKey = (it, idx) => it?.id ?? idx;

  // ── useMemo ───────────────────────────────────────────────
  const cadTotalQty    = useMemo(() => totalCadBondQty(items), [items]);
  const cadDiscountPct = useMemo(() => cadBulkDiscountPct(cadTotalQty), [cadTotalQty]);
  const cadNext        = useMemo(() => cadNextTier(cadTotalQty), [cadTotalQty]);

  // Total estimado del carrito
  const cartTotal = useMemo(() => {
    let sum = 0;
    let hasUnknown = false;
    for (const it of items) {
      const p = getItemPrice(it);
      if (p !== null) sum += p.total;
      else hasUnknown = true;
    }
    return { sum, hasUnknown };
  }, [items, catalogPricesVersion]);

  // ── useEffect ─────────────────────────────────────────────
  // Auto-abrir checkout cuando se indica (ej. "Confirmar pedido" desde Servicios)
  useEffect(() => {
    if (open && autoCheckout && items.length > 0) {
      setCheckoutOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoCheckout]);

  // Cuando abre: set tab + seleccionar item (focusItemId > primero)
  useEffect(() => {
    if (!open) return;

    setTab(initialTab || "pedido");
    setEditHinted(false); // reinicia la animación del botón "Editar opciones"

    if (!items.length) {
      setActiveKey(null);
      return;
    }

    if (focusItemId != null) {
      setActiveKey(focusItemId);
      return;
    }

    const firstKey = getItemKey(items[0], 0);
    setActiveKey((prev) => (prev == null ? firstKey : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length, initialTab, focusItemId]);

  // Cerrar con ESC + bloquear scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const activeItem = useMemo(() => {
    if (activeKey == null) return null;
    const found = items.find((it, idx) => getItemKey(it, idx) === activeKey);
    return found || items[0] || null;
  }, [items, activeKey]);

  // Detectar si el ítem activo es fotobotones/pines (para vista circular)
  const isPinsItem = useMemo(() => {
    if (!activeItem) return false;
    const raw = (
      activeItem.serviceKey  ||
      activeItem.service?.key ||
      activeItem.serviceName  ||
      activeItem.serviceLabel ||
      activeItem.service?.name ||
      ""
    ).toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    return raw.includes("fotobot") || raw === "pin" || raw === "pines" ||
      (raw.includes("pin") && !raw.includes("imprimir") && !raw.includes("impresion"));
  }, [activeItem]);

  const updateItemOptions = (itemId, patch) => {
    if (!itemId) return;
    if (typeof cartApi.updateItemOptions === "function") {
      cartApi.updateItemOptions(itemId, patch);
      return;
    }
    console.warn("updateItemOptions no está disponible en CartContext");
  };

  const handleRemove = (id) => {
    if (typeof removeItem === "function") removeItem(id);
  };

  const handleClear = () => {
    if (typeof clearCart === "function") clearCart();
  };

  if (!open) return null;

  const hasAnyFile = !!(
    activeItem?.file ||
    activeItem?.pdfFile ||
    activeItem?.fileObject ||
    activeItem?.blob
  );

  const hasAnyUrl = !!(
    activeItem?.pdfUrl ||
    activeItem?.fileUrl ||
    activeItem?.previewUrl ||
    activeItem?.url ||
    activeItem?.src
  );

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Cerrar carrito"
      />

      {/* Panel */}
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[980px] shadow-2xl"
        style={{ backgroundColor: '#0D121B', borderLeft: '1px solid #273449' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #273449' }}>
            <div>
              <h3 className="font-semibold" style={{ color: '#F5F7FA' }}>Tu pedido</h3>
              <p className="text-xs mt-0.5" style={{ color: '#9AA6B2' }}>{items.length} elemento(s)</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-lg transition"
                style={{ backgroundColor: 'rgba(27,36,51,0.8)', color: '#9AA6B2', border: '1px solid #273449' }}
                onClick={handleClear}
              >
                Vaciar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-lg transition"
                style={{ backgroundColor: 'rgba(27,36,51,0.8)', color: '#E5ECF6', border: '1px solid #273449' }}
                onClick={onClose}
              >
                Cerrar ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3">
            <div className="inline-flex rounded-xl p-1" style={{ backgroundColor: '#1B2433', border: '1px solid #273449' }}>
              {["pedido", "editar"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="px-3 py-1.5 text-xs rounded-lg transition font-medium"
                  style={tab === t
                    ? { backgroundColor: '#273449', color: '#F5F7FA' }
                    : { color: '#9AA6B2' }
                  }
                >
                  {t === "pedido" ? "Tu pedido" : "Editar elementos"}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden p-4">
            {items.length === 0 ? (
              <div className="text-sm" style={{ color: '#9AA6B2' }}>Tu carrito está vacío.</div>
            ) : (
              <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                {/* Lista de items */}
                <div className="h-full overflow-y-auto pr-1 space-y-2">
                  {items.map((it, idx) => {
                    const k = getItemKey(it, idx);
                    const title =
                      it.serviceLabel || it.serviceName || it.service?.name || it.serviceKey || "Servicio";
                    const isActive = k === activeKey;

                    return (
                      <div
                        key={String(k)}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveKey(k)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveKey(k); }
                        }}
                        className="w-full text-left rounded-xl p-3 transition cursor-pointer outline-none"
                        style={isActive
                          ? { backgroundColor: 'rgba(31,74,168,0.15)', border: '1px solid rgba(31,74,168,0.5)' }
                          : { backgroundColor: '#111827', border: '1px solid #273449' }
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: '#F5F7FA' }}>{title}</p>
                            {it.fileName && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: '#9AA6B2' }}>{it.fileName}</p>
                            )}
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: '#1B2433', color: '#9AA6B2' }}>
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          {(() => {
                            const p = getItemPrice(it);
                            return p !== null ? (
                              <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#34D399' }}>
                                ${fmtMXN(p.total)}
                              </span>
                            ) : (
                              <span className="text-[11px]" style={{ color: '#6B7280' }}>
                                a cotizar
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            className="text-[11px] px-2 py-0.5 rounded transition"
                            style={{ backgroundColor: 'rgba(153,27,27,0.2)', color: '#FCA5A5', border: '1px solid rgba(153,27,27,0.3)' }}
                            onClick={(e) => { e.stopPropagation(); handleRemove(it.id); }}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Panel derecho */}
                <div className="h-full overflow-y-auto space-y-4 pr-1">
                  {/* Preview */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #273449', backgroundColor: '#0A0E14' }}>
                    <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #273449' }}>
                      <p className="text-xs" style={{ color: '#9AA6B2' }}>Vista previa</p>
                      <p className="text-xs truncate max-w-[180px]" style={{ color: '#4E7BDA' }}>{activeItem?.fileName || ""}</p>
                    </div>
                    <div className="h-[clamp(280px,42vh,460px)]">
                      {(hasAnyFile || hasAnyUrl) && activeItem ? (
                        isPinsItem ? (
                          <PinCircularPreview
                            item={activeItem}
                            opts={activeItem.options || {}}
                            onChangeOptions={(patch) =>
                              updateItemOptions(activeItem.id, patch)
                            }
                          />
                        ) : (
                          <PdfPreview item={activeItem} />
                        )
                      ) : (
                        <div className="h-full grid place-items-center text-sm" style={{ color: '#9AA6B2' }}>
                          No hay archivo para previsualizar.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenido por tab */}
                  {tab === "pedido" ? (
                    <div className="rounded-2xl p-4" style={{ backgroundColor: '#111827', border: '1px solid #273449' }}>
                      <p className="text-sm font-semibold" style={{ color: '#F5F7FA' }}>Elemento seleccionado</p>
                      <p className="text-xs mt-1" style={{ color: '#9AA6B2' }}>
                        Revisa las opciones y edita si es necesario.
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => { setTab("editar"); setEditHinted(true); }}
                          className={[
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            !editHinted
                              ? "animate-bounce ring-2 ring-blue-400/70 shadow-[0_0_12px_2px_rgba(96,165,250,0.45)]"
                              : "",
                          ].join(" ")}
                          style={{
                            backgroundColor: editHinted ? '#1B2433' : 'rgba(31,74,168,0.25)',
                            color: '#E5ECF6',
                            border: editHinted ? '1px solid #273449' : '1px solid rgba(96,165,250,0.55)',
                          }}
                        >
                          ✏️ Editar opciones
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-4" style={{ backgroundColor: '#111827', border: '1px solid #273449' }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: '#F5F7FA' }}>
                        Editar opciones del elemento seleccionado
                      </p>
                      {activeItem ? (
                        <ServiceOptionsEditor
                          item={activeItem}
                          onChangeOptions={(patch) => updateItemOptions(activeItem.id, patch)}
                        />
                      ) : (
                        <div className="text-sm" style={{ color: '#9AA6B2' }}>Selecciona un elemento.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 space-y-3" style={{ borderTop: '1px solid #273449' }}>

            {/* ── Banner de descuento CAD ───────────────────────── */}
            {cadTotalQty > 0 && cadDiscountPct > 0 && (
              <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
                style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                <span className="text-lg shrink-0 mt-0.5">🎉</span>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "#FDE047" }}>
                    Descuento por volumen del {cadDiscountPct}% aplicado
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#CA8A04" }}>
                    {cadTotalQty} planos CAD/Bond en tu carrito.
                    {cadNext
                      ? ` Agrega ${cadNext.needed} más para subir al ${cadNext.pct}%.`
                      : " ¡Ya tienes el descuento máximo!"}
                  </p>
                </div>
              </div>
            )}

            {/* Invitación si hay planos CAD pero aún no llegan al umbral */}
            {cadTotalQty > 0 && cadDiscountPct === 0 && cadNext && (
              <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <span className="text-lg shrink-0 mt-0.5">💡</span>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: "#A5B4FC" }}>
                    Agrega {cadNext.needed} plano{cadNext.needed !== 1 ? "s" : ""} CAD más y obtén {cadNext.pct}% de descuento
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#6366F1" }}>
                    Aplica a planos CAD/solo líneas en papel Bond (color o B&N).
                  </p>
                </div>
              </div>
            )}

            {/* Total estimado del carrito */}
            {items.length > 0 && (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.22)",
                }}>
                <div>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: "#6EE7B7" }}>
                    {cartTotal.sum === 0
                      ? "Precio a cotizar"
                      : cartTotal.hasUnknown
                        ? "Total parcial estimado"
                        : "Total estimado"}
                  </p>
                  {cartTotal.sum === 0 && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#9AA6B2" }}>
                      Te confirmamos el precio antes de imprimir.
                    </p>
                  )}
                  {cartTotal.sum > 0 && cartTotal.hasUnknown && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#9AA6B2" }}>
                      * Algunos servicios se cotizan en sucursal.
                    </p>
                  )}
                </div>
                <span className="text-[22px] font-bold tabular-nums" style={{ color: "#34D399" }}>
                  {cartTotal.sum > 0 ? `$${fmtMXN(cartTotal.sum)}` : "—"}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[.99]"
              style={{ backgroundColor: '#1F4AA8', color: '#FFFFFF' }}
            >
              🛒 Agregar otro servicio
            </button>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setCheckoutOpen(true)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
            >
              Confirmar pedido →
            </button>
            <p className="text-[11px]" style={{ color: '#9AA6B2' }}>
              *El total se confirma antes de imprimir.
            </p>
          </div>
        </div>
      </aside>

      {/* Modal de checkout */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          // Si se confirmó (carrito vacío), cerramos el overlay también
          if (items.length === 0) onClose?.();
        }}
        user={user}
        session={session}
        profile={profile}
      />
    </div>
  );
}
