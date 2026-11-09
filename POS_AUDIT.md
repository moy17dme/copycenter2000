# Auditoría y fases del POS · 9 noviembre 2026

## Arquitectura encontrada

React 18, Vite 8, Tailwind 3, React Router 7; Supabase Auth/PostgreSQL/Storage y Edge Functions; Cloudflare Pages conectado a `moy17dme/copycenter2000`, rama de producción `main`. Gestor: pnpm 11.1.3. Rama de trabajo: `feat/pos-copycenter2000`.

Se conserva la tienda, carrito, catálogo, cotizador, Auth y pedidos. `src/lib/catalogPrices.js` carga precios y escucha cambios; `src/utils/getItemPrice.js` y `priceList.js` incluyen cálculos y tarifas heredadas. El checkout tiene copias en `supabase/functions/_shared/`, por lo que consolidarlo completamente necesita pruebas de paridad por servicio antes de sustituirlo. No se reemplaza de golpe en este lanzamiento.

Supabase contiene 154 reglas en `catalogo_precios`: 137 de impresión y 17 de engargolado. Su clave comercial es servicio/categoría/variante/formato + rango. Engargolado usa hojas para seleccionar tarifa, y número de trabajos para multiplicar. Hay rangos heredados traslapados. La tienda mantiene su comportamiento histórico mientras se revisan; el POS bloquea esos casos. Las demás familias no tienen catálogo central completo y no se inventan precios.

La tabla tenía lectura pública pero ninguna política de edición para administradores. La migración agrega edición restringida, historial inmutable de cambios, visibilidad pública y tratamiento de IVA pendiente. La interfaz ya no muestra un guardado exitoso si Supabase rechaza la modificación.

## Primera entrega funcional

- Caja diaria compartida con apertura, cobro, movimientos y cierre inmutable, protegida por RPC y RLS de administrador.
- Búsqueda de tarifas existentes y cálculo por volumen mediante selector compartido sin constantes nuevas de precios.
- Validación del precio/rango en PostgreSQL, snapshots históricos y bloqueo de precios manipulados o cambiados entre consulta y cobro.
- Trabajos compuestos por varias partidas y precios especiales capturados por administrador.
- Capturas PNG de ticket y corte para compartir manualmente en WhatsApp. Cambio solicitado por el propietario: no activar Twilio ni envío automático.
- Historial, consulta por fecha, recuperación idempotente ante respuesta de cobro perdida, auditoría de precios.

## Fases siguientes y dependencias

1. Completar catálogo: importador con vista previa, aprobación de rangos traslapados, SKU/unidades y todas las familias. Confirmar tratamiento de IVA, redondeo y precios de cliente. Consolidar motor de checkout con pruebas de paridad; los fallbacks heredados siguen presentes.
2. MVP de empleados: permisos por acción para diseñador/auxiliar, cajas por empleado/turno, ruta privada independiente del panel admin. Este lanzamiento sigue reservado a administradores.
3. Pagos: pagos mixtos, anticipos, saldo pendiente, cancelación/devolución autorizada, descuentos con límites y snapshots. No marcar operaciones parciales como pagadas.
4. Cotizaciones y producción: folios, conversión transaccional a pedido/venta, PDF, archivos privados y bitácora de estados. Reutilizar `orders`, políticas de Storage y generación PDF existentes; no duplicar estas tablas.
5. Administración: reportes por empleado/categoría, exportaciones CSV/PDF, usuarios y autorizaciones. Posteriormente inventario y costos separados del precio público.

El MVP completo del prompt no se declara terminado: están pendientes empleados, pagos mixtos/anticipos, cotizaciones, anulaciones, impuestos aprobados y producción integrada. Sus casos de prueba tampoco se reportan como aprobados.

## Verificación

`pnpm test:pos`: migraciones en PostgreSQL WASM (PGlite), permisos, efectivo/cambio, tres medios de pago por separado, idempotencia, conciliación, precio por volumen, trabajo compuesto, snapshot ante cambio de precio y rechazo de manipulación. Fixtures ficticios aislados; no ventas de prueba en producción.

`pnpm test:pos:browser`: interfaz real con transporte simulado, apertura, fallo de red después del guardado, reintento sin duplicación, WhatsApp y PNG, cierre con diferencia y escritorio/móvil. No demuestra entrega real en WhatsApp.

`pnpm lint:pos`: ámbito nuevo del POS. El lint del Admin heredado tiene errores preexistentes (imports/variables sin uso, regex de saneamiento y bloque catch vacío) fuera del cambio. `pnpm build` verifica cliente, SSR y prerender público. Los cierres y ventas se serializan con bloqueo de la caja, pero una prueba de carga multisesión real sigue pendiente.
