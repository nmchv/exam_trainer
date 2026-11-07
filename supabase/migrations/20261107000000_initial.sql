create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id text not null,
  mode text not null check (mode in ('practice', 'exam')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric,
  max_score numeric,
  percentage numeric,
  state jsonb not null default '{}'::jsonb
);
create index if not exists attempts_user_started_idx on public.attempts (user_id, started_at desc);

create table if not exists public.attempt_tasks (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  task_id text not null,
  variant_id text,
  position integer not null check (position >= 0),
  max_score numeric not null default 1 check (max_score >= 0),
  awarded_score numeric,
  unique (attempt_id, position),
  unique (attempt_id, task_id)
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_task_id uuid not null unique references public.attempt_tasks (id) on delete cascade,
  user_answer jsonb,
  is_correct boolean,
  awarded_score numeric,
  answered_at timestamptz not null default now()
);

create table if not exists public.task_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id text not null,
  task_id text not null,
  attempts_count integer not null default 0 check (attempts_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= attempts_count),
  last_attempt_at timestamptz,
  unique (user_id, exam_id, task_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- This table is readable only by Edge Functions using the service_role key.
create table if not exists public.task_answer_keys (
  task_id text primary key,
  exam_id text not null,
  answer jsonb,
  check_rules jsonb not null default '{}'::jsonb,
  max_score numeric not null default 1 check (max_score >= 0),
  manual_check boolean not null default false,
  explanation text not null default ''
);

create table if not exists public.exam_scoring_rules (
  exam_id text primary key,
  year integer not null,
  grade_scale jsonb not null default '[]'::jsonb
);

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_tasks enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.task_progress enable row level security;
alter table public.user_settings enable row level security;
alter table public.task_answer_keys enable row level security;
alter table public.exam_scoring_rules enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "attempts_select_own" on public.attempts;
create policy "attempts_select_own" on public.attempts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own" on public.attempts
  for insert to authenticated with check (
    user_id = (select auth.uid()) and status = 'in_progress'
  );
drop policy if exists "attempts_update_own" on public.attempts;
create policy "attempts_update_own" on public.attempts
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'in_progress');

drop policy if exists "attempt_tasks_select_own" on public.attempt_tasks;
create policy "attempt_tasks_select_own" on public.attempt_tasks
  for select to authenticated using (
    exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  );
drop policy if exists "attempt_tasks_insert_own" on public.attempt_tasks;
create policy "attempt_tasks_insert_own" on public.attempt_tasks
  for insert to authenticated with check (
    exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  );
drop policy if exists "attempt_tasks_update_own" on public.attempt_tasks;
create policy "attempt_tasks_update_own" on public.attempt_tasks
  for update to authenticated using (
    exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  );

drop policy if exists "attempt_answers_select_own" on public.attempt_answers;
create policy "attempt_answers_select_own" on public.attempt_answers
  for select to authenticated using (
    exists (
      select 1 from public.attempt_tasks t join public.attempts a on a.id = t.attempt_id
      where t.id = attempt_task_id and a.user_id = (select auth.uid())
    )
  );
drop policy if exists "attempt_answers_insert_own" on public.attempt_answers;
create policy "attempt_answers_insert_own" on public.attempt_answers
  for insert to authenticated with check (
    exists (
      select 1 from public.attempt_tasks t join public.attempts a on a.id = t.attempt_id
      where t.id = attempt_task_id and a.user_id = (select auth.uid())
    )
  );
drop policy if exists "attempt_answers_update_own" on public.attempt_answers;
create policy "attempt_answers_update_own" on public.attempt_answers
  for update to authenticated using (
    exists (
      select 1 from public.attempt_tasks t join public.attempts a on a.id = t.attempt_id
      where t.id = attempt_task_id and a.user_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.attempt_tasks t join public.attempts a on a.id = t.attempt_id
      where t.id = attempt_task_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "task_progress_select_own" on public.task_progress;
create policy "task_progress_select_own" on public.task_progress
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Edge Functions use the service role. Browser roles never get access to answer keys.
revoke all on public.task_answer_keys, public.exam_scoring_rules, public.task_progress,
  public.attempts, public.attempt_tasks, public.attempt_answers, public.profiles,
  public.user_settings from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, username, display_name) on public.profiles to authenticated;
grant update (display_name, username) on public.profiles to authenticated;
grant select on public.attempts to authenticated;
grant insert (id, user_id, exam_id, mode, status, started_at, state) on public.attempts to authenticated;
grant update (mode, status, state) on public.attempts to authenticated;
grant select on public.attempt_tasks to authenticated;
grant insert (id, attempt_id, task_id, variant_id, position, max_score) on public.attempt_tasks to authenticated;
grant update (id, attempt_id, task_id, variant_id, position, max_score) on public.attempt_tasks to authenticated;
grant select on public.attempt_answers to authenticated;
grant insert (id, attempt_task_id, user_answer, answered_at) on public.attempt_answers to authenticated;
grant update (id, attempt_task_id, user_answer, answered_at) on public.attempt_answers to authenticated;
grant select on public.task_progress to authenticated;
grant select on public.user_settings to authenticated;
grant insert (user_id, settings, updated_at) on public.user_settings to authenticated;
grant update (settings, updated_at) on public.user_settings to authenticated;
grant all on public.task_answer_keys, public.exam_scoring_rules, public.task_progress to service_role;
grant all on public.attempts, public.attempt_tasks, public.attempt_answers to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
