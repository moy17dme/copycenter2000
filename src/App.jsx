// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Section from "./components/Section";
import Hero from "./components/Hero";
import Servicios from "./components/Servicios";
import Precios from "./components/Precios";
import GoogleReviews from "./components/GoogleReviews";
import Footer from "./components/Footer";
import Seo from "./components/Seo";
import { CartProvider } from "./components/CartContext";
import CartOverlay from "./components/CartOverlay";
import AuthModal from "./components/AuthModal";

import ProductosPage from "./pages/ProductosPage";
import EquiposPage from "./pages/EquiposPage";
import MisPedidos from "./pages/MisPedidos";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import LegalPage from "./pages/LegalPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import PortfolioPage from "./pages/PortfolioPage";
import PricesPage from "./pages/PricesPage";
import ServicesPage from "./pages/ServicesPage";
import ResourcesPage from "./pages/ResourcesPage";
import PrintFileGuidePage from "./pages/PrintFileGuidePage";
import WhatsAppWidget from "./components/WhatsAppWidget";
import { OAUTH_RESUME_CHECKOUT_KEY } from "./lib/googleAuth";

// ✅ OJO: App.jsx está en src/, por eso es ./lib/...
import { supabase } from "./lib/supabaseClient";

// Devuelve "Nombre Apellido" desde un nombre completo.
// Ej: "Daniel Moises Perez Garcia" → "Daniel Perez"
function formatShortName(fullName) {
  if (!fullName) return fullName;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 4) return `${parts[0]} ${parts[2]}`;
  if (parts.length === 3) return `${parts[0]} ${parts[1]}`;
  return parts.join(" ");
}

function withTimeout(promise, ms, fallback) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, hash]);

  return null;
}

function HomePage({ openCart }) {
  return (
    <>
      <Seo path="/" />
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-20 pt-28 sm:px-6 md:pt-24 lg:px-8">
        <Section id="inicio">
          <Hero />
        </Section>

        <Section id="servicios">
          <Servicios
            onAddedToCart={() => openCart({ tab: "editar" })}
            onDirectCheckout={() => openCart({ tab: "pedido", autoCheckout: true })}
          />
        </Section>

        <Section id="precios">
          <Precios />
        </Section>

        <Section id="opiniones">
          <GoogleReviews />
        </Section>
      </main>
    </>
  );
}

function NoIndexRoute({ path, title, children }) {
  return (
    <>
      <Seo
        path={path}
        title={`${title} | Copy Center 2000`}
        description="Área funcional de Copy Center 2000."
        noindex
      />
      {children}
    </>
  );
}

export default function App() {
  const location = useLocation();

  // carrito
  const [cartOpen, setCartOpen] = useState(false);
  const [cartTab, setCartTab] = useState("pedido");
  const [cartFocusId, setCartFocusId] = useState(null);
  const [cartAutoCheckout, setCartAutoCheckout] = useState(false);

  // auth modal
  const [authOpen, setAuthOpen] = useState(false);

  // sesión
  const [session, setSession] = useState(null);
  const user = session?.user ?? null;

  // profile
  const [profile, setProfile] = useState(null);

  // helpers carrito
  const openCart = ({ tab = "pedido", focusId = null, autoCheckout = false } = {}) => {
    setCartTab(tab);
    setCartFocusId(focusId);
    setCartAutoCheckout(autoCheckout);
    setCartOpen(true);
  };

  const closeCart = () => {
    setCartOpen(false);
    setCartFocusId(null);
    setCartTab("pedido");
    setCartAutoCheckout(false);
  };

  // helpers auth modal
  const openAuth = () => setAuthOpen(true);
  const closeAuth = () => setAuthOpen(false);

  const buildProfileFallback = (u) => ({
    id: u.id,
    full_name: u.user_metadata?.full_name || "",
    phone: u.user_metadata?.phone || u.user_metadata?.whatsapp || "",
    whatsapp: u.user_metadata?.whatsapp || "",
    address: u.user_metadata?.address || "",
    company: u.user_metadata?.company || "",
    _supportsBillingProfile: false,
    role: u.app_metadata?.role || u.user_metadata?.role || "customer",
  });

  const loadProfile = async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }

    const fallbackProfile = buildProfileFallback(u);

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .single(),
        7000,
        { data: null, error: new Error("profiles timeout") }
      );

      if (!error && data) {
        setProfile({
          ...data,
          _supportsBillingProfile:
            Object.prototype.hasOwnProperty.call(data, "rfc") &&
            Object.prototype.hasOwnProperty.call(data, "razon_social") &&
            Object.prototype.hasOwnProperty.call(data, "constancia_path"),
        });
        return;
      }

      if (error?.message === "profiles timeout") {
        setProfile((current) => (current?.id === u.id ? current : fallbackProfile));
        return;
      }

      setProfile(fallbackProfile);
    } catch (e) {
      const message = e?.message || e;
      if (message !== "profiles timeout") {
        console.warn("[profiles] fallback:", message);
      }
      setProfile((current) => (current?.id === u.id ? current : fallbackProfile));
    }
  };

  const displayName = useMemo(() => {
    const full =
      (profile?.full_name || "").trim() ||
      (user?.user_metadata?.full_name || "").trim() ||
      "";
    if (full) return formatShortName(full);
    return user?.email || "";
  }, [profile, user]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          console.warn("getSession error:", error.message);
          setSession(null);
          setProfile(null);
          return;
        }

        const s = data?.session ?? null;
        setSession(s);
        loadProfile(s?.user ?? null);
      } catch (e) {
        console.warn("[boot] error:", e?.message || e);
        setSession(null);
        setProfile(null);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);

      // Si se salió, limpia UI
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setAuthOpen(false);
        return;
      }

      window.setTimeout(() => {
        if (alive) loadProfile(newSession?.user ?? null);
      }, 0);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
    if (!user || normalizedPath === "/auth/callback") return;

    try {
      if (sessionStorage.getItem(OAUTH_RESUME_CHECKOUT_KEY) !== "1") return;
      sessionStorage.removeItem(OAUTH_RESUME_CHECKOUT_KEY);
      openCart({ tab: "pedido", autoCheckout: true });
    } catch {
      // El checkout puede abrirse manualmente si el almacenamiento esta bloqueado.
    }
  }, [location.pathname, user]);

  return (
    <CartProvider>
      <div className="relative min-h-screen flex flex-col bg-background text-foreground">
        <ScrollToHash />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar
            onOpenCart={() => openCart({ tab: "pedido" })}
            onOpenAuth={openAuth}
            user={user}
            session={session}
            profile={profile}
            displayName={displayName}
          />

          <Routes>
            <Route path="/" element={<HomePage openCart={openCart} />} />
            <Route path="/servicios" element={<ServicesPage />} />
            <Route path="/precios" element={<PricesPage />} />
            <Route path="/acerca-de" element={<AboutPage />} />
            <Route path="/preguntas-frecuentes" element={<FaqPage />} />
            <Route path="/contacto" element={<ContactPage />} />
            <Route path="/portafolio" element={<PortfolioPage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route
              path="/recursos/como-preparar-archivos-para-imprimir"
              element={<PrintFileGuidePage />}
            />
            <Route
              path="/productos"
              element={
                <NoIndexRoute path="/productos" title="Productos">
                  <ProductosPage />
                </NoIndexRoute>
              }
            />
            <Route
              path="/equipos"
              element={
                <NoIndexRoute path="/equipos" title="Equipos">
                  <EquiposPage />
                </NoIndexRoute>
              }
            />
            <Route
              path="/mis-pedidos"
              element={
                <NoIndexRoute path="/mis-pedidos" title="Mis pedidos">
                  <MisPedidos user={user} session={session} />
                </NoIndexRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <NoIndexRoute path="/admin" title="Administración">
                  <Admin user={user} accessToken={session?.access_token || null} profile={profile} />
                </NoIndexRoute>
              }
            />
            <Route
              path="/auth/callback"
              element={
                <NoIndexRoute path="/auth/callback" title="Acceso">
                  <AuthCallback />
                </NoIndexRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <NoIndexRoute path="/reset-password" title="Restablecer contraseña">
                  <ResetPassword />
                </NoIndexRoute>
              }
            />
            <Route path="/aviso-privacidad" element={<LegalPage type="privacy" />} />
            <Route path="/terminos" element={<LegalPage type="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />

          <CartOverlay
            open={cartOpen}
            onClose={closeCart}
            initialTab={cartTab}
            focusItemId={cartFocusId}
            autoCheckout={cartAutoCheckout}
            user={user}
            session={session}
            profile={profile}
          />

          <AuthModal
            key={user?.id || "guest"}
            open={authOpen}
            onClose={closeAuth}
            onSignedOut={() => { setSession(null); setProfile(null); setAuthOpen(false); }}
            user={user}
            displayName={displayName}
          />

          <WhatsAppWidget phone="527713531668" />
        </div>
      </div>
    </CartProvider>
  );
}
