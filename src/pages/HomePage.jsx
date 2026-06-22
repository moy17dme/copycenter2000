import Section from "../components/Section";
import Hero from "../components/Hero";
import Servicios from "../components/Servicios";
import Precios from "../components/Precios";
import GoogleReviews from "../components/GoogleReviews";
import Seo from "../components/Seo";

export default function HomePage({ openCart }) {
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
