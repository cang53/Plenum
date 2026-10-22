-- A project's old email address is reserved for that project (stage 4, S4-5). Without this, another
-- workspace could claim a released address and receive mail suppliers still send to the old one.
-- Mail to a retired address is dropped like mail to any unknown address.

create table public.retired_slugs (
  slug text primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  retired_at timestamptz not null default now()
);
alter table public.retired_slugs enable row level security;
revoke all on public.retired_slugs from authenticated, anon;

create function public.reserve_old_slug() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_slug is distinct from old.email_slug then
    if exists (select 1 from retired_slugs where slug = new.email_slug and project_id <> new.id) then
      raise exception 'that address belongs to another project' using errcode = 'unique_violation';
    end if;
    -- Taking an old address back un-retires it.
    delete from retired_slugs where slug = new.email_slug;
    insert into retired_slugs (slug, project_id) values (old.email_slug, old.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger projects_reserve_old_slug before update of email_slug on public.projects
for each row execute function public.reserve_old_slug();
revoke execute on function public.reserve_old_slug() from public, anon, authenticated;

-- New projects cannot take a retired address either.
create function public.check_new_slug_free() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from retired_slugs where slug = new.email_slug) then
    raise exception 'that address belongs to another project' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;
create trigger projects_new_slug_free before insert on public.projects
for each row execute function public.check_new_slug_free();
revoke execute on function public.check_new_slug_free() from public, anon, authenticated;
