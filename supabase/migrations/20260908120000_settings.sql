-- Личные настройки владельца: пока одна — длина рабочего дня в часах.
-- Одна строка на пользователя, синхронизируется вместе с остальным.

create table if not exists public.settings (
  user_id    uuid primary key references auth.users (id) on delete cascade
               default auth.uid(),
  day_hours  numeric not null default 8,
  updated_at timestamptz not null default now()
);

create index if not exists settings_updated_idx on public.settings (updated_at);

alter table public.settings enable row level security;

drop policy if exists settings_own on public.settings;
create policy settings_own on public.settings
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
