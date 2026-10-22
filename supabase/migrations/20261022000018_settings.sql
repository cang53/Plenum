-- Settings (stage 4, S4-5): a language per person. Name edits use the existing "edit own profile" policy,
-- project name and slug edits the existing "managers edit projects" policy.
alter table public.profiles
  add column locale text not null default 'en' check (locale ~ '^[a-z]{2}$'),
  add constraint profiles_display_name_not_blank check (length(trim(display_name)) > 0);
