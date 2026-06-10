// src/components/Navbar.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, Package, ShieldCheck, ShoppingCart, UserRound, X } from "lucide-react";
import logo from "../assets/LOGOcopy.png";
import { supabase } from "../lib/supabaseClient";
import { hasAdminRole, useIsAdmin } from "../lib/useIsAdmin";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/servicios", label: "Servicios" },
  { to: "/precios", label: "Precios" },
  { to: "/portafolio", label: "Portafolio" },
  { to: "/recursos", label: "Recursos" },
  { to: "/contacto", label: "Contacto" },
];

export default function Navbar({
  onOpenCart,
  onOpenAuth,
  user,
  profile,
  displayName,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hash, pathname } = useLocation();
  const { isAdmin: verifiedIsAdmin } = useIsAdmin({ user, profile });
  const showAdminLink = Boolean(user && (hasAdminRole(user, profile) || verifiedIsAdmin));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [hash, pathname]);

  const name = useMemo(() => {
    const n = (displayName || "").trim() || user?.email || "";
    if (n.includes("@")) return n.split("@")[0];
    return n;
  }, [displayName, user]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
      alert(e?.message || "No se pudo cerrar sesion");
    }
  }

  const isActiveLink = (to) => {
    if (to === "/") return pathname === "/";
    if (to === "/recursos") return pathname.startsWith("/recursos");
    if (to.startsWith("/#")) return pathname === "/" && hash === to.slice(1);
    return pathname === to;
  };

  const linkClass = (to) => [
    "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition",
    isActiveLink(to)
      ? "bg-primary text-white shadow-sm"
      : "text-muted-foreground hover:bg-secondary hover:text-white",
  ].join(" ");

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl transition-shadow duration-200",
        scrolled ? "shadow-[0_14px_34px_rgba(0,0,0,0.28)]" : "",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img
            src={logo}
            alt="Copy Center 2000"
            className="h-8 w-auto max-w-[148px] object-contain drop-shadow sm:max-w-none"
          />
        </Link>

        <ul className="hidden items-center gap-1 rounded-lg border border-border/70 bg-secondary/30 p-1 xl:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={linkClass(l.to)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          {user && (
            <span className="hidden max-w-32 truncate text-sm text-muted-foreground xl:inline">
              Hola{ name ? `, ${name}` : "" }
            </span>
          )}

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 sm:inline-flex"
            >
              Ingresar
            </button>
          ) : (
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {showAdminLink && (
                <Link
                  to="/admin"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-orange-300/40 bg-orange-400/10 px-3 py-2 text-sm font-medium text-orange-200 transition hover:bg-orange-400/15"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}

              <Link
                to="/mis-pedidos"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
              >
                <Package className="h-4 w-4" />
                Mis pedidos
              </Link>

              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
              >
                <UserRound className="h-4 w-4" />
                Mi cuenta
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground transition hover:bg-muted hover:text-white"
                aria-label="Salir"
                title="Salir"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/70 text-secondary-foreground transition hover:bg-muted xl:hidden"
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 active:scale-[.99] sm:px-4"
          >
            <span className="hidden sm:inline">Carrito</span>
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/70 bg-background/95 shadow-[0_18px_36px_rgba(0,0,0,0.32)] xl:hidden">
          <div className="mx-auto grid max-w-7xl gap-2 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`${linkClass(l.to)} w-full justify-between py-2.5`}
              >
                {l.label}
              </Link>
            ))}

            <div className="mt-2 grid gap-2 border-t border-border/70 pt-3">
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth?.();
                  }}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
                >
                  Ingresar
                </button>
              ) : (
                <>
                  {showAdminLink && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300/40 bg-orange-400/10 px-4 py-2.5 text-sm font-medium text-orange-200 transition hover:bg-orange-400/15"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  )}

                  <Link
                    to="/mis-pedidos"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/70 px-4 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                  >
                    <Package className="h-4 w-4" />
                    Mis pedidos
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      onOpenAuth?.();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/70 px-4 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                  >
                    <UserRound className="h-4 w-4" />
                    Mi cuenta
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Salir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
