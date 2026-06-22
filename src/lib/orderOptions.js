// src/lib/orderOptions.js
// Formatea las opciones de cada item para el panel admin en pares { label, value }

export function fmtOptionsAdmin(item) {
  const o = item.options || {};
  const rows = [];

  const add = (label, value) => {
    if (value === undefined || value === null || value === "") return;
    rows.push({ label, value: String(value) });
  };

  switch (item.serviceKey) {
    case "ticket-cobro":
      add("Código", o.ticketCode);
      if (o.ticketDescription) add("Concepto", o.ticketDescription);
      if (o.ticketQuantity) add("Cantidad", o.ticketQuantity);
      if (o.ticketUnitPrice) add("Precio unitario", `$${o.ticketUnitPrice}`);
      break;

    case "impresion":
      add("Color", o.colorMode === "bn" ? "Blanco y negro" : "Color");
      if (o.paper) add("Papel", o.paper);
      if (o.size) add("Tamaño", o.size);
      if (o.tech) add("Tecnología", o.tech === "inkjet" ? "Inyección de tinta" : "Láser");
      if (o.printSets) add("Juegos", o.printSets);
      if (o.sides) add("Caras", o.sides === "doble" ? "Doble cara" : "Una cara");
      if (o.finishes) {
        const f = o.finishes;
        if (f.engargolado?.enabled) {
          let eng = "Engargolado";
          if (f.engargolado.color) eng += ` ${f.engargolado.color}`;
          rows.push({ label: "Acabado", value: eng });
        }
        if (f.laminado?.enabled) {
          rows.push({ label: "Laminado", value: f.laminado.sides === "doble" ? "Doble cara" : "Una cara" });
        }
        if (f.enmicado?.enabled) {
          let enm = "Enmicado";
          if (f.enmicado.size) enm += ` ${f.enmicado.size}`;
          if (f.enmicado.type) enm += ` ${f.enmicado.type}`;
          rows.push({ label: "Enmicado", value: enm });
        }
      }
      break;

    case "copias":
      add("Tamaño", o.copySize || "Carta");
      add("Tipo", o.copyColorMode === "color" ? "Color" : "Blanco y negro");
      if (o.copyQtyApprox) add("Cantidad aprox.", `${o.copyQtyApprox} cop.`);
      if (o.copySides === "doble") add("Caras", "Doble cara");
      if (o.copyFinish && o.copyFinish !== "ninguno") {
        const finMap = { engrapado: "Engrapado", perforado_folder: "Perforado / folder", engargolado: "Engargolado" };
        add("Acabado", finMap[o.copyFinish] || o.copyFinish);
      }
      break;

    case "engargolado":
      add("Tipo de arillo", o.bindType === "plastico" ? "Plástico" : "Metálico");
      add("Páginas por juego", o.bindPages || 1);
      add("Cantidad", o.bindQty || 1);
      if (o.bindNotes) add("Notas", o.bindNotes);
      break;

    case "actas": {
      const actaLabels = {
        nacimiento: "Nacimiento",
        matrimonio: "Matrimonio",
        defuncion: "Defunción",
      };
      const documentType = o.documentType || "nacimiento";
      add("Tipo de acta", actaLabels[documentType] || documentType);
      if (documentType === "nacimiento") add("CURP", o.documentCurp);
      if (documentType === "matrimonio") {
        add("CURP primera persona", o.documentCurpPartner1);
        add("CURP segunda persona", o.documentCurpPartner2);
      }
      if (o.documentNotes) add("Notas", o.documentNotes);
      break;
    }

    case "acta-nacimiento":
      add("CURP", o.documentCurp);
      if (o.documentNotes) add("Notas", o.documentNotes);
      break;

    case "acta-matrimonio":
    case "acta-defuncion":
      if (o.documentNotes) add("Datos / notas", o.documentNotes);
      break;

    case "constancia-situacion-fiscal":
      add("RFC", o.documentRfc);
      add("ID de CIF", o.documentIdCif);
      if (o.documentNotes) add("Notas", o.documentNotes);
      break;

    case "planos":
    case "ploteo":
      add("Color", o.planColorMode === "color" ? "Color" : "Blanco y negro");
      if (o.planPaper) add("Papel", o.planPaper);
      if (o.planSizeKey) add("Tamaño", `${o.planSizeKey} cm`);
      if (o.planType) add("Tipo de plano", o.planType);
      if (o.planDeliver) add("Entrega", o.planDeliver);
      break;

    case "artes":
      if (o.artProjectType) add("Tipo de proyecto", o.artProjectType);
      if (o.artOutputType) add("Salida", o.artOutputType);
      if (o.artSize) add("Tamaño", o.artSize);
      if (o.artQtyApprox) add("Cantidad aprox.", o.artQtyApprox);
      if (o.artMaterial) add("Material", o.artMaterial);
      if (o.artFinish) add("Acabado", o.artFinish);
      if (o.artMillares) add("Millares", o.artMillares);
      if (o.artUrgency && o.artUrgency !== "normal") add("Urgencia", "Urgente");
      break;

    case "stickers":
      if (o.stkShape) add("Forma", o.stkShape);
      if (o.stkMaterial) add("Material", o.stkMaterial);
      {
        const qty = o.stkQtyPreset !== "custom" ? o.stkQtyPreset : o.stkQtyCustom;
        if (qty) add("Cantidad", `${qty} pzs`);
      }
      if (o.stkSizePreset && o.stkSizePreset !== "custom")
        add("Tamaño", `${o.stkSizePreset} cm`);
      else if (o.stkWidthCm)
        add("Tamaño", `${o.stkWidthCm} × ${o.stkHeightCm} cm`);
      if (o.stkLaminado) add("Laminado", "Sí");
      break;

    case "pvc":
      if (o.pvcVariant) add("Variante", o.pvcVariant);
      if (o.pvcSides) add("Caras", o.pvcSides);
      if (o.pvcVariableData) add("Datos variables", "Sí (folio/código)");
      if (o.pvcPortaGafete) add("Porta gafete", "Sí");
      if (o.pvcCordon) add("Cordón", "Sí");
      if (o.pvcNotes) add("Nota", o.pvcNotes);
      break;

    case "sublimacion":
      if (o.subProductType) add("Producto", o.subProductType);
      if (o.subBaseColor) add("Color base", o.subBaseColor);
      {
        const sizes = [];
        if (o.subSizeCH) sizes.push(`CH: ${o.subSizeCH}`);
        if (o.subSizeM) sizes.push(`M: ${o.subSizeM}`);
        if (o.subSizeG) sizes.push(`G: ${o.subSizeG}`);
        if (o.subSizeXL) sizes.push(`XL: ${o.subSizeXL}`);
        if (sizes.length) add("Tallas", sizes.join(", "));
      }
      if (o.subRush) add("Urgencia", "Urgente");
      if (o.subDueDate) add("Fecha límite", o.subDueDate);
      if (o.subNotes) add("Nota", o.subNotes);
      break;

    case "fotobotones":
      add("Tamaño", `${o.pinSizeCm || "5.8"} cm`);
      add("Film", o.pinFinish || "mate");
      add("Cantidad", `${o.pinQty || 1} pzs`);
      if (o.pinType && o.pinType !== "pin") add("Tipo", o.pinType);
      if (o.pinNotes) add("Nota", o.pinNotes);
      break;

    case "escaneo":
      add("Tipo", o.scanColorMode === "color" ? "Color" : "Blanco y negro");
      add("Tamaño", o.scanSize || "Carta");
      if (o.scanQtyApprox) add("Páginas aprox.", o.scanQtyApprox);
      if (o.scanDuplex === "doble") add("Cara", "Doble cara");
      add("Resolución", `${o.scanDpi || "300"} DPI`);
      if (o.scanOutput) add("Formato salida", o.scanOutput);
      break;

    default:
      // Fallback genérico: mostrar todas las claves planas
      for (const [k, v] of Object.entries(o)) {
        if (v === "" || v === null || v === undefined || v === false) continue;
        if (typeof v === "object") continue; // skip nested
        add(k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), v);
      }
      break;
  }

  return rows;
}
