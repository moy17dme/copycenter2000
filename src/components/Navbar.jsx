// src/components/Navbar.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/LOGOcopy.png";
import { supabase } from "../lib/supabaseClient";

const links = [
  { to: "/#inicio", label: "Inicio" },
  { to: "/#servicios", label: "Servicios" },
  { to: "/#precios", label: "Precios" },
  { to: "/productos", label: "Productos" },
  { to: "/equipos", label: "Equipos" },
];

export default function Navbar({
  onOpenCart,
  onOpenAuth,
  user,
  profile,
  displayName,
}) {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Nombre a mostrar: viene ya formateado como "Nombre Apellido" desde App.jsx
  const name = useMemo(() => {
    const n = (displayName || "").trim() || user?.email || "";
    if (n.includes("@")) return n.split("@")[0];
    return n;
  }, [displayName, user]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      // si quieres abrir modal luego de salir:
      // onOpenAuth?.();
    } catch (e) {
      console.error("Logout error:", e);
      alert(e?.message || "No se pudo cerrar sesión");
    }
  }

  const isHome = pathname === "/";

  return (
    <header
      className={[
        "fixed top-0 inset-x-0 z-50 transition-all duration-200",
        "border-b",
        scrolled
          ? "backdrop-blur-md shadow-lg"
          : "border-transparent",
      ].join(" ")}
      style={scrolled
        ? { backgroundColor: 'rgba(10,14,20,0.85)', borderColor: '#273449' }
        : { backgroundColor: 'transparent' }
      }
    >
      <nav className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/#inicio" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Copy Center 2000"
            className="h-7 md:h-8 w-auto drop-shadow"
          />
        </Link>

        {/* Links desktop */}
        <ul className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="text-sm font-medium transition-colors"
                style={{ color: '#9AA6B2' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#F5F7FA'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9AA6B2'}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Saludo (solo cuando está logueado) */}
          {user && (
            <span className="hidden lg:inline text-sm mr-1" style={{ color: '#9AA6B2' }}>
              Hola{ name ? `, ${name}` : "" }
            </span>
          )}

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition"
              style={{ backgroundColor: '#1F4AA8', color: '#FFFFFF' }}
            >
              Ingresar
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/mis-pedidos"
                className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm transition"
                style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}
              >
                📦 Mis pedidos
              </Link>

              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm transition"
                style={{ border: '1px solid #273449', color: '#E5ECF6', backgroundColor: 'rgba(27,36,51,0.6)' }}
              >
                Mi cuenta
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm transition"
                style={{ border: '1px solid #273449', color: '#9AA6B2', backgroundColor: 'rgba(27,36,51,0.4)' }}
              >
                Salir
              </button>
            </div>
          )}

          {/* Carrito */}
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg transition-all hover:scale-[1.03] active:scale-[.98]"
            style={{ backgroundColor: '#C61C1C', color: '#FFFFFF' }}
          >
            <span className="hidden sm:inline mr-1.5">Carrito</span>
            <span aria-hidden="true">🛒</span>
          </button>
        </div>
      </nav>

      {/* Mini aviso opcional solo en Home (puedes quitarlo) */}
      {isHome && (
        <div className="hidden md:block max-w-7xl mx-auto px-4 pb-2">
          <div className="text-[12px] text-white/60">
            {/* espacio para mensaje/estatus si quieres */}
          </div>
        </div>
      )}
    </header>
  );
}
