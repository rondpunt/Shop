-- Add search_path to remaining functions and lock down execute
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_single_default_car()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.is_default then
    update public.cars
      set is_default = false
      where user_id = new.user_id
        and id <> new.id
        and is_default = true;
  end if;
  return new;
end;
$$;

-- Revoke direct execution of internal trigger functions
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.enforce_single_default_car() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;