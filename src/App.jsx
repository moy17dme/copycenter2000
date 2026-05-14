// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Section from "./components/Section";
import Hero from "./components/Hero";
import Servicios from "./components/Servicios";
import Precios from "./components/Precios";
import FabPedido from "./components/FabPedido";
import Footer from "./components/Footer";
import CustomCursor from "./components/CustomCursor";
import { CartProvider } from "./components/CartContext";
import CartOverlay from "./components/CartOverlay";
import AuthModal from "./components/AuthModal";

import ProductosPage from "./pages/ProductosPage";
import EquiposPage from "./pages/EquiposPage";
import MisPedidos from "./pages/MisPedidos";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import WhatsAppWidget from "./components/WhatsAppWidget";

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
    <main className="flex-1 w-full px-4 sm:px-8 lg:px-16 2xl:px-32 pt-6 md:pt-10 pb-24 relative z-10">
      <Section id="inicio">
        <Hero />
      </Section>

      <Section id="precios" label="Precios (referencia)">
        <Precios />
      </Section>

      <Section id="servicios">
        <Servicios
          onAddedToCart={() => openCart({ tab: "editar" })}
          onDirectCheckout={() => openCart({ tab: "pedido", autoCheckout: true })}
        />
      </Section>
    </main>
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

  const showFab = location.pathname === "/";

  const loadProfile = async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, whatsapp, address, company, role")
        .eq("id", u.id)
        .single();

      if (!error && data) {
        setProfile(data);
        return;
      }

      setProfile({
        id: u.id,
        full_name: u.user_metadata?.full_name || "",
        phone: u.user_metadata?.phone || u.user_metadata?.whatsapp || "",
        whatsapp: u.user_metadata?.whatsapp || "",
        address: u.user_metadata?.address || "",
        company: u.user_metadata?.company || "",
        role: "customer",
      });
    } catch (e) {
      console.warn("[profiles] fallback:", e?.message || e);
      setProfile({
        id: u.id,
        full_name: u.user_metadata?.full_name || "",
        phone: u.user_metadata?.phone || u.user_metadata?.whatsapp || "",
        whatsapp: u.user_metadata?.whatsapp || "",
        address: u.user_metadata?.address || "",
        company: u.user_metadata?.company || "",
        role: "customer",
      });
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
        await loadProfile(s?.user ?? null);
      } catch (e) {
        console.warn("[boot] error:", e?.message || e);
        setSession(null);
        setProfile(null);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession ?? null);
      await loadProfile(newSession?.user ?? null);

      // Si se salió, limpia UI
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setAuthOpen(false);
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <CartProvider>
      <div className="relative min-h-screen flex flex-col bg-background text-foreground">
        <CustomCursor />
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
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/mis-pedidos" element={<MisPedidos user={user} />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />

          {showFab && <FabPedido onClick={() => openCart({ tab: "pedido" })} />}

          <CartOverlay
            open={cartOpen}
            onClose={closeCart}
            initialTab={cartTab}
            focusItemId={cartFocusId}
            autoCheckout={cartAutoCheckout}
            user={user}
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
