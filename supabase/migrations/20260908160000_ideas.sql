-- Идеи по доработке самого «Пульса»: предложено → в работе → сделано.
-- Очередь заданий — это не отдельная таблица, а статус 'queued'.

create table if not exists public.ideas (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade
               default auth.uid(),
  title      text not null,
  rationale  text not null default '',
  -- proposed · queued · done · dismissed
  status     text not null default 'proposed',
  -- claude · owner: пригодится, когда появится второе мнение
  source     text not null default 'claude',
  -- чем закрыто: короткий хеш коммита
  done_ref   text not null default '',
  created_at timestamptz not null default now(),
  queued_at  timestamptz,
  done_at    timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ideas_updated_idx on public.ideas (updated_at);

alter table public.ideas enable row level security;

drop policy if exists ideas_own on public.ideas;
create policy ideas_own on public.ideas
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
