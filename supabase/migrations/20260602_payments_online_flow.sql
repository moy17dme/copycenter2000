-- Copy Center 2000 - online payment hardening.
-- Stores payment attempts and Mercado Pago webhook payloads separately from orders.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_preference_id text,
  provider_payment_id text,
  amount numeric(12,2) not null,
  currency text not null default 'MXN',
  status text not null default 'pending',
  checkout_url text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists order_id uuid references public.orders(id) on delete cascade,
  add column if not exists provider text not null default 'mercadopago',
  add column if not exists provider_preference_id text,
  add column if not exists provider_payment_id text,
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists currency text not null default 'MXN',
  add column if not exists status text not null default 'pending',
  add column if not exists checkout_url text,
  add column if not exists raw_event jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists payments_provider_payment_id_idx
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_status_idx on public.payments(status);

alter table public.payments enable row level security;

drop policy if exists "payments_owner_read" on public.payments;
drop policy if exists "payments_admin_all" on public.payments;

create policy "payments_owner_read" on public.payments
  for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = payments.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "payments_admin_all" on public.payments
  for all
  using (public.is_copycenter_admin())
  with check (public.is_copycenter_admin());

alter table public.orders
  add column if not exists pricing_summary jsonb,
  add column if not exists coupon_code text;

notify pgrst, 'reload schema';
