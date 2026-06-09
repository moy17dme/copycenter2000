-- Mercado Pago Checkout API via Orders.
-- Keeps the Orders API identifier separate from legacy Checkout Pro preferences.

alter table public.payments
  add column if not exists provider_order_id text;

create unique index if not exists payments_provider_order_id_idx
  on public.payments(provider, provider_order_id)
  where provider_order_id is not null;

notify pgrst, 'reload schema';
