-- Agrega columna billing_info a orders
-- y columnas de facturación al perfil del usuario

alter table orders
  add column if not exists billing_info jsonb default null;

alter table profiles
  add column if not exists rfc            text default null,
  add column if not exists razon_social   text default null,
  add column if not exists constancia_path text default null;

comment on column orders.billing_info     is 'Datos de facturación del pedido {requiresInvoice, rfc, razonSocial, email, constanciaPath}';
comment on column profiles.rfc            is 'RFC del cliente para facturación';
comment on column profiles.razon_social   is 'Razón social para CFDI';
comment on column profiles.constancia_path is 'Path en Storage de la constancia de situación fiscal';
