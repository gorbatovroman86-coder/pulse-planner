-- Стикер проекта на доске: свой значок и порог смерти по умолчанию 2 дня.

alter table public.projects
  add column if not exists emoji text not null default '';

-- Новый порог: проект считается умершим, если два дня ни одна задача не закрыта.
alter table public.projects
  alter column cooldown_days set default 2;

update public.projects set cooldown_days = 2, updated_at = now()
  where cooldown_days = 7;
