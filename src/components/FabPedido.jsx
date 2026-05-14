export default function FabPedido() {
  return (
    <a
      href="#pedido"
      className="fixed right-4 bottom-4 z-40 inline-flex items-center rounded-full
                 bg-[--color-accent] text-white px-4 py-3 text-sm font-semibold shadow-xl
                 hover:opacity-90 md:hidden"
      aria-label="Ir a realizar pedido"
    >
      ¡Realiza tu pedido!
    </a>
  );
}
