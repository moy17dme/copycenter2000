import FileDropzone from "./FileDropzone";

export default function PedidoPlaceholder() {
  const handleNewFiles = (arr) => {
    // Aquí integras con tu carrito / preview / cálculo
    // console.log("Archivos añadidos:", arr);
  };

  return (
    <div className="card p-6 md:p-8 text-[--color-ink] interactive-card">
      <h3 className="text-xl font-semibold">Realiza tu pedido</h3>
      <p className="text-slate-700 mt-2">
        Sube tus archivos y ajusta opciones (color, tamaño, dúplex, N-up, etc.).
      </p>

      <div className="mt-6">
        <FileDropzone onFiles={handleNewFiles} />
      </div>
    </div>
  );
}
