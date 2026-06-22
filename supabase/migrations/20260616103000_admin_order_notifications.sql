-- Deduplicates automatic admin notifications for order events.

begin;

create table if not exists public.admin_order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('new_order', 'payment_confirmed')),
  channels text[] not null default '{}'::text[],
  status text not null default 'pending' check (status in ('pending', 'sent', 'partial', 'failed', 'skipped')),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (order_id, event_type)
);

alter table public.admin_order_notifications enable row level security;

revoke all on public.admin_order_notifications from public, anon, authenticated;
grant select, insert, update on public.admin_order_notifications to service_role;

notify pgrst, 'reload schema';

commit;
