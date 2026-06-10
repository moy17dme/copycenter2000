// src/pages/NotFound.jsx
import { Link } from "react-router-dom";
import Seo from "../components/Seo";

export default function NotFound() {
  return (
    <>
      <Seo
        path="/404"
        title="Página no encontrada | Copy Center 2000"
        description="La página solicitada no existe."
        noindex
      />
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-16 2xl:px-32 pt-28 pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold text-white">Página no encontrada</h1>
          <p className="mt-2 text-white/70">La ruta no existe.</p>
          <Link
            to="/"
            className="inline-flex mt-4 rounded-2xl px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/10"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
    </>
  );
}
