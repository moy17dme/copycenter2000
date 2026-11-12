const vinylSlugs = {
  'vinil-mate': 'vinil_mate',
  'vinil-brillante': 'vinil_brillante',
  'vinil-transparente': 'transparente',
};

export function quoteStickers(opts, rows) {
  const qty = Number(opts.stkQtyPreset && opts.stkQtyPreset !== 'custom' ? opts.stkQtyPreset : opts.stkQtyCustom);
  const width = Number(opts.stkWidthCm);
  const height = Number(opts.stkHeightCm);
  if (!Number.isSafeInteger(qty) || qty < 1 || !(width > 0 && height > 0)) return null;
  const slug = vinylSlugs[opts.stkMaterial || 'vinil-mate'];
  const matches = rows.filter(r => r.servicio === 'mimaki_uv' && r.categoria_slug === slug &&
    r.activo && r.visible_publico && r.iva_modo === 'adicional');
  if (matches.length !== 1) return null;
  const rate = matches[0];
  const printableWidth = Number(rate.ancho_rollo_cm) - 4;
  const grossCents = Math.round(Math.round(Number(rate.precio) * 100) * 116 / 100);
  if (!(printableWidth > 0 && grossCents > 0)) return null;
  // The cutter takes strips up to 50 cm wide. Include the remaining narrow strip.
  const pitch = width + 0.4;
  const feed = height + 0.4;
  const acrossStrip = Math.floor(Math.min(50, printableWidth) / pitch);
  const alongStrip = Math.floor(140 / feed);
  const acrossRoll = Math.floor(printableWidth / 50) * acrossStrip + Math.floor((printableWidth % 50) / pitch);
  if (!acrossStrip || !alongStrip || !acrossRoll) return null;
  // Keep the existing 10 cm grip and bill production length in whole centimetres.
  const realCm = Math.ceil(Number((Math.ceil(qty / acrossRoll) * feed + 10).toFixed(6)));
  const billedCm = realCm < 50 ? realCm + 30 : realCm;
  const printCents = Math.round(billedCm * grossCents / 100);
  const cutCents = qty * (opts.stkCutType === 'individual' ? 50 : 40);
  const strips = Math.ceil(qty / (acrossStrip * alongStrip));
  const laminateCents = opts.stkLaminado ? strips * 150 * (opts.stkLaminadoTipo === 'mate' ? 107 : 60) : 0;
  const total = (printCents + cutCents + laminateCents) / 100;
  return {total, perUnit: Number((total / qty).toFixed(2)), qty, label: qty === 1 ? '1 sticker' : qty+' stickers', realCm, billedCm};
}
