// src/pages/EquiposPage.jsx
import { Link } from "react-router-dom";

export default function EquiposPage() {
  return (
    <main className="flex-1 w-full px-4 sm:px-8 lg:px-16 2xl:px-32 pt-20 pb-24">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-semibold text-white">Equipos</h1>
        <p className="mt-2 text-white/70">
          Página independiente para equipos (renta/venta/descr. técnica, etc.).
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-white font-medium">Aquí puedes poner</p>
          <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-1">
            <li>Impresoras / plotters disponibles</li>
            <li>Especificaciones</li>
            <li>Galería</li>
            <li>Botón de cotización por WhatsApp</li>
          </ul>
        </div>

        <div className="mt-8">
          <Link
            to="/#inicio"
            className="inline-flex rounded-2xl px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/10"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
