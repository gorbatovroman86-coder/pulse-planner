-- Пульс — схема хранилища.
-- Две таблицы, у каждой владелец (user_id) и мягкое удаление (deleted_at).
-- Row Level Security обязательна: пользователь видит только свои строки.

create extension if not exists "pgcrypto";

-- ── Проекты ───────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade
                        default auth.uid(),
  name                text not null default 'Новый проект',
  color               text not null default '#5E5A52',
  description         text not null default '',
  status              text not null default 'active'
                        check (status in ('active', 'paused', 'archived')),
  weekly_budget_hours numeric not null default 4,
  cooldown_days       integer not null default 7,
  last_touch_at       timestamptz,
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

-- ── Задачи ────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id               uuid primary key,
  user_id          uuid not null references auth.users (id) on delete cascade
                     default auth.uid(),
  project_id       uuid references public.projects (id) on delete set null,
  title            text not null default '',
  priority         integer not null default 3 check (priority between 1 and 3),
  due_date         date,
  estimate_minutes integer not null default 0,
  status           text not null default 'inbox'
                     check (status in ('inbox', 'today', 'done')),
  done_at          timestamptz,
  sort_order       integer not null default 0,
  note             text not null default '',
  subtasks         jsonb not null default '[]'::jsonb,
  is_example       boolean not null default false,
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index if not exists projects_user_idx    on public.projects (user_id);
create index if not exists projects_updated_idx on public.projects (updated_at);
create index if not exists tasks_user_idx       on public.tasks (user_id);
create index if not exists tasks_updated_idx    on public.tasks (updated_at);
create index if not exists tasks_project_idx    on public.tasks (project_id);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

drop policy if exists projects_own on public.projects;
create policy projects_own on public.projects
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tasks_own on public.tasks;
create policy tasks_own on public.tasks
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
