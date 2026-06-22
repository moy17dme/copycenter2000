-- Make profile creation friendlier for OAuth providers such as Google.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, whatsapp, address, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    ),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), ''),
    coalesce(nullif(new.raw_user_meta_data->>'whatsapp', ''), ''),
    coalesce(nullif(new.raw_user_meta_data->>'address', ''), ''),
    'customer'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    phone = coalesce(nullif(excluded.phone, ''), profiles.phone),
    whatsapp = coalesce(nullif(excluded.whatsapp, ''), profiles.whatsapp),
    address = coalesce(nullif(excluded.address, ''), profiles.address);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';

commit;
