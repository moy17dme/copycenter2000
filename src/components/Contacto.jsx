// src/components/Contacto.jsx
import Section from "./Section";

export default function Contacto() {
  return (
    <Section id="contacto" label="DATOS DE CONTACTO">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border p-6">
          <h3 className="font-semibold text-ink">Ubicación y horario</h3>
          <p className="text-sm text-slate-600 mt-2">
            Calle Gral. Vicente Segura 301-A, Periodistas, 42060 Pachuca de Soto, Hgo.<br/>
            Lun–Vie: 8:00 a 19:30
            <p>Sáb: 9:00 a 15:00</p>
          </p>
          <p className="text-sm text-slate-600 mt-2">
            Tel: 771 719 5613<br/> WhatsApp: 771 353 1668
          </p>
        </div>

        {/* Mapa/imagen de ubicación (placeholder) */}
        <div className="rounded-2xl bg-white border p-2">
          <div className="h-56 w-full rounded-xl bg-gradient-to-br from-accent/10 to-primary/10" />
        </div>
      </div>
    </Section>
  );
}
