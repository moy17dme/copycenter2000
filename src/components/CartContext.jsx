// src/components/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isOfficeFile, OFFICE_BLOCK_MESSAGE } from "../utils/fileGuards";
import { saveFile, getFile, deleteFile, clearAllFiles } from "../utils/fileStore";

const CartContext = createContext(null);
const STORAGE_KEY = "cc2000_cart_v2";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Devuelve el objeto File/Blob que trae el payload, sea cual sea el campo. */
function extractFile(payload) {
  return payload?.file || payload?.pdfFile || payload?.fileObject || payload?.blob || null;
}

export function CartProvider({ children }) {
  // Carga inicial desde localStorage (sin archivos — los archivos viven en IndexedDB)
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [cartMessage, setCartMessage] = useState("");
  const clearCartMessage = () => setCartMessage("");

  // ── Al montar: restaurar archivos desde IndexedDB ──────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await Promise.all(
        items.map(async (item) => {
          // Si el item ya tiene archivo en memoria, no hace falta restaurar
          if (extractFile(item)) return item;
          try {
            const file = await getFile(item.id);
            if (file) return { ...item, file };
          } catch {}
          return item;
        })
      );
      if (!cancelled) setItems(restored);
    })();
    return () => { cancelled = true; };
  // Solo al montar — restaurar archivos de la sesión anterior
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistir en localStorage (sin archivos binarios) ─────────────────
  useEffect(() => {
    const safe = items.map(({ file, pdfFile, fileObject, blob, previewUrl, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [items]);

  // ── addItem ────────────────────────────────────────────────────────────
  const addItem = (payload) => {
    const file = extractFile(payload);
    const name = payload?.fileName || file?.name || payload?.name || "";

    if (isOfficeFile(file) || isOfficeFile(name)) {
      setCartMessage(OFFICE_BLOCK_MESSAGE);
      return;
    }
    setCartMessage("");

    const id = uid();

    // Guardar el archivo en IndexedDB de forma asíncrona
    if (file) {
      saveFile(id, file).catch(console.error);
    }

    const baseQuantity = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;
    setItems((prev) => [
      ...prev,
      { id, quantity: baseQuantity, note: "", options: {}, ...payload },
    ]);
  };

  // ── updateItem / updateItemOptions ─────────────────────────────────────
  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const updateItemOptions = (id, optionsPatch) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, options: { ...it.options, ...optionsPatch } } : it
      )
    );
  };

  // ── removeItem ─────────────────────────────────────────────────────────
  const removeItem = (id) => {
    deleteFile(id).catch(console.error);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // ── clearCart ──────────────────────────────────────────────────────────
  const clearCart = () => {
    clearAllFiles().catch(console.error);
    setItems([]);
    setCartMessage("");
  };

  const value = useMemo(
    () => ({
      items,
      setItems,
      addItem,
      updateItem,
      updateItemOptions,
      removeItem,
      cartMessage,
      clearCartMessage,
      clear: clearCart,
      clearCart,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cartMessage]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
