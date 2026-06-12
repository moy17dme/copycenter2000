# Seguridad de Copy Center 2000

## Modelo de pago

El flujo recomendado redirige al checkout alojado de Mercado Pago. El formulario
embebido queda desactivado por defecto con `VITE_ENABLE_EMBEDDED_CARD_FORM=false`.
Esto reduce la exposicion PCI y evita que numero de tarjeta y CVV pasen por el DOM
de Copy Center 2000.

## Despliegue obligatorio

1. Aplicar todas las migraciones con `supabase db push`.
2. Configurar los secretos de `supabase/functions/.env.example` en Supabase.
3. Desplegar las cuatro Edge Functions despues de aplicar la migracion de seguridad,
   incluida `upload-order-file`.
4. Confirmar que el hosting respeta `public/_headers`. Si el proveedor no soporta
   ese archivo, copiar las mismas cabeceras a su configuracion.
5. Colocar el dominio detras de Cloudflare u otro CDN/WAF y activar:
   - proteccion DDoS administrada;
   - challenge para trafico automatizado;
   - limite por IP en `/auth/v1/*` y `/functions/v1/*`;
   - bloqueo de paises solo si el negocio no los atiende;
   - DNSSEC y redireccion HTTPS obligatoria.
6. En Supabase Auth activar confirmacion de correo, proteccion contra contrasenas
   filtradas, CAPTCHA y MFA obligatorio para administradores.

## Secretos

- Nunca usar `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` o
  `SUPABASE_SERVICE_ROLE_KEY` en variables `VITE_*`.
- `VITE_SUPABASE_ANON_KEY` y `VITE_MP_PUBLIC_KEY` son identificadores publicos
  para el navegador; su seguridad depende de RLS, restricciones de origen y los
  permisos configurados, no de ocultarlos.
- Rotar de inmediato cualquier secreto que haya sido publicado o compartido.
- Mantener `.env` fuera de Git y usar el gestor de secretos del proveedor.
- Ejecutar `npm run security:audit` antes de cada despliegue.

## Archivos

El bucket `order-files` debe permanecer privado y no permite subidas directas
desde el navegador, ni siquiera para administradores. `upload-order-file`
verifica sesion, propiedad del pedido, rate limiting, tamano y firma binaria
antes de guardar. Solo acepta PDF, PNG y JPG/JPEG de hasta 25 MB. Los PDF con
JavaScript, acciones automaticas, adjuntos, formularios activos o cifrado se
rechazan. Cambiar la extension de un script o archivo de texto no evita la
validacion.
El convertidor de Office queda apagado por defecto. Solo debe habilitarse con
`ENABLE_DOCUMENT_CONVERTER=true` dentro de un contenedor aislado, sin acceso de
red saliente y con limites estrictos de CPU y memoria.

## Respuesta a incidentes

Ante actividad sospechosa: pausar pagos, rotar secretos de Mercado Pago y
Supabase, revocar sesiones, exportar logs de Edge Functions/WAF y revisar las
tablas `payments`, `api_rate_limits` y el historial de pedidos.
