# Caja y ventas

## Empleados y venta rápida

En **Admin → Empleados → Agregar empleado**, registra nombre, correo y puesto (diseñador/auxiliar). Por defecto puede vender y abrir la caja compartida; cerrar, registrar movimientos y consultar días anteriores requieren permisos adicionales. Guardar no envía correos. Usa **Enviar invitación** para que quien aún no tiene cuenta reciba un enlace para crear su contraseña. Si ya tiene cuenta, usa la misma. La entrada es **https://copycenter2000.com/pos**. No se crearon empleados reales durante la implementación.

Los accesos se guardan en `pos_team` y se vinculan únicamente a un correo verificado de Supabase Auth. Ningún dato de registro enviado por el empleado concede permisos. El administrador puede desactivar el acceso; los cobros y cambios de permisos conservan la identidad de quien los realizó. Empleados ven sus propios tickets y los totales operativos de la caja compartida del día. No pueden cambiar tarifas ni capturar precios especiales, incluso llamando directamente al servidor. El historial de cambios de permisos se guarda en `pos_team_audit`.

La venta comienza con **Buscar → elegir servicio → cantidad → Agregar**. El precio unitario y total salen del catálogo y cambian con el rango de volumen. Se importaron las 51 reglas de copias ya existentes en `priceList.js`; no se llenó el hueco heredado de B/N entre 5,000 y 9,999 copias. El corte y los tickets tienen sus propias pestañas.

Despliegue adicional: `pnpm dlx supabase functions deploy pos-invite --project-ref zdebbsyuoqsttqfwvxlg`. Las invitaciones reutilizan el correo de Supabase Auth, respetan los límites del proveedor y requieren una sesión de administrador. La función no permite que el navegador elija la URL de regreso.

**Modo elegido por el propietario (9 noviembre 2026): capturas para WhatsApp, sin Twilio.** En cada ticket usa «Compartir imagen» y en caja «Compartir imagen del corte/resumen». En móvil elige WhatsApp; en computadora se descarga el PNG para adjuntarlo. «Abrir WhatsApp del propietario» prepara el mensaje para +52 771 236 8040. El operador debe enviarlo. Los horarios 19:25 lunes a viernes y 14:50 sábados son referencias operativas; no hay envío automático activado.

Para este modo aplica las migraciones y publica el frontend (pasos 1–2). **No ejecutes los pasos 3–5 de Twilio ni `pos-schedule.sql`.** El historial de avisos registra contenido preparado, no prueba de entrega. Si posteriormente se solicita automatización, la configuración opcional se conserva abajo.

El módulo se abre en **Admin → Caja y ventas**. Registra ventas de mostrador pagadas en efectivo, terminal externa o transferencia. No ejecuta cargos de tarjeta. Los pedidos en línea y los tickets anteriores conservan su flujo y no se suman a este libro de caja para evitar duplicados.

## Activación

1. Ejecutar `pnpm dlx supabase db push --remote --dry-run` y revisar; luego `pnpm dlx supabase db push --remote --yes`. Incluye `20261109120000_point_of_sale.sql` y `20261109130000_pos_catalog.sql` después de las migraciones existentes, especialmente la de seguridad que define `is_copycenter_admin`.
2. Publicar el frontend con el procedimiento habitual del proyecto.
3. Configurar los siguientes secretos en **Supabase Edge Functions**, nunca con prefijo `VITE_`:
   - `POS_NOTIFY_WHATSAPP_TO=+527712368040`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (formato `whatsapp:+...`) o `TWILIO_MESSAGING_SERVICE_SID`
   - `POS_WHATSAPP_CONTENT_SID`: plantilla aprobada de WhatsApp con una variable `{{1}}` para el resumen. Por ejemplo, texto fijo suficiente alrededor de la variable: «Copy Center 2000. Actualización de tu caja: {{1}}. Consulta el detalle completo en tu panel administrativo.» La aprobación depende de Meta/Twilio. Se compactan espacios y se limita el detalle a 1,000 caracteres; el panel conserva todas las partidas.
   - `POS_CRON_SECRET`: secreto aleatorio exclusivo para el programador.
4. Desplegar: `supabase functions deploy pos-notifications --no-verify-jwt`. La función verifica `x-pos-secret`, no acepta llamadas sin este secreto y nunca usa datos proporcionados por clientes para construir avisos.
5. Activar Cron (`pg_cron`), `pg_net` y Vault. Guardar mediante la interfaz de Vault `pos_function_url` (URL completa de la función) y `pos_cron_secret` (mismo valor que `POS_CRON_SECRET`). Ejecutar `supabase/pos-schedule.sql`.

El programador procesa la cola cada minuto, aunque el navegador esté cerrado. El resumen previo sale lunes a viernes a las **19:25** y sábados a las **14:50**, zona **America/Mexico_City**. No se programa el domingo. El resumen refleja las ventas hasta ese momento y no cierra la caja; el cierre manual manda otro aviso con el conteo y diferencia. Los días sin apertura no generan resumen.

## Operación

- Abrir la caja con el fondo inicial. Solo hay una caja por fecha para todo el mostrador.
- Buscar un servicio, indicar cantidad y agregarlo; el precio unitario y total son automáticos. Capturar pago recibido y teléfono opcional del cliente. Todos los importes se validan en centavos en el servidor. Los empleados autorizados pueden operar; solo administradores capturan precios especiales.
- Confirmar la venta después de recibir el pago. Para tarjeta se utiliza la terminal externa y para transferencia se verifica el depósito.
- Compartir el ticket abre WhatsApp con el texto listo: el operador debe pulsar Enviar. También se puede descargar el ticket. El texto no sustituye una factura fiscal.
- Registrar entradas y retiros con motivo. Al final contar efectivo y cerrar; el servidor guarda un corte inmutable, bloquea nuevas ventas en ese día y calcula fondo + ventas en efectivo + movimientos − efectivo contado para la conciliación (la diferencia mostrada es contado menos esperado).
- Consultar días anteriores para revisar o cerrar cajas pendientes. Un cierre no se puede reabrir desde la interfaz. Esta versión no incluye devoluciones, cancelaciones, inventario ni varias cajas independientes.
- El corte suma todas las ventas; el historial muestra las 200 más recientes y 100 movimientos. Los avisos muestran los últimos 20 eventos de todas las fechas.

## Verificación y recuperación

Antes del uso real, probar apertura, una venta de cada forma de pago, cambio, retiro, corte, acceso con usuario no administrador, entrega al destinatario de pruebas y ejecución de ambos horarios. «Aceptado» significa aceptado por Twilio, no entregado ni leído: revisar entrega final en los registros de Twilio.

Las ventas usan UUID de idempotencia y los reintentos de la pantalla conservan el mismo payload. Si la red falla, reintentar en la misma pantalla; si se recarga o cambia de sección, revisar primero el historial antes de capturar nuevamente. Ventas, movimientos y cierres se serializan con un bloqueo de fila de caja. Las notificaciones se encolan en la misma transacción que la venta o corte. Tienen hasta cinco intentos con espera progresiva. Si Twilio acepta un mensaje y se pierde la respuesta, un reintento podría duplicar el aviso; el cobro no se duplica. Revisar Twilio antes de reactivar manualmente un aviso fallido. Una interrupción exactamente a la hora del cron puede requerir ejecutar manualmente el trabajo de resumen ese mismo día.

Referencias: [programar Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [plantillas WhatsApp](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates), [variables de plantilla](https://www.twilio.com/docs/content/using-variables-with-content-api).
