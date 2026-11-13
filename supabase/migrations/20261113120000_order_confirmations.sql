alter table public.orders
  add column if not exists pickup_confirmed_local timestamp without time zone,
  add column if not exists receipt_received_at timestamptz,
  add column if not exists agreed_total numeric(12,2) check (agreed_total > 0);

-- These confirmations belong to staff. Customers can still create orders,
-- attach files and cancel under the existing order policies.
create or replace function public.guard_order_confirmations()
returns trigger language plpgsql set search_path = public as $$
begin
  if session_user in ('postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role'
     or public.is_copycenter_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.pickup_confirmed_local is null and new.receipt_received_at is null
       and new.agreed_total is null then return new; end if;
  elsif new.pickup_confirmed_local is not distinct from old.pickup_confirmed_local
    and new.receipt_received_at is not distinct from old.receipt_received_at
    and new.agreed_total is not distinct from old.agreed_total then
    return new;
  end if;
  raise exception 'Staff confirmation required' using errcode = '42501';
end;
$$;

drop trigger if exists guard_order_confirmations on public.orders;
create trigger guard_order_confirmations before insert or update on public.orders
for each row execute function public.guard_order_confirmations();

notify pgrst, 'reload schema';
