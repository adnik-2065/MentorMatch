-- MentorMatch schema — profiles, placement goals and mentor experience.
-- Idempotent: `npm run db:migrate` can be re-run safely. Needs Postgres 13+
-- (gen_random_uuid is built in from 13).

create table if not exists profiles (
  id                uuid primary key default gen_random_uuid(),
  -- sha256 of the httpOnly owner cookie; the raw token is never stored.
  owner_token_hash  text not null unique,
  role              text not null check (role in ('junior', 'mentor')),
  name              text not null check (char_length(name) between 1 and 80),
  college           text not null check (char_length(college) between 1 and 120),
  year              text not null,
  branch            text not null,
  learn_topics      text[] not null default '{}',
  teach_topics      text[] not null default '{}',
  placement_season  text not null default '' check (char_length(placement_season) <= 40),
  availability      jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles (role);

-- A student's target companies and positions. `match_key` is the normalized
-- form used for matching ("L&T" and "Larsen & Toubro" share one key).
create table if not exists placement_targets (
  profile_id  uuid not null references profiles (id) on delete cascade,
  kind        text not null check (kind in ('company', 'position')),
  label       text not null check (char_length(label) between 1 and 80),
  match_key   text not null,
  sort_order  int  not null,
  primary key (profile_id, kind, match_key)
);

create index if not exists placement_targets_key_idx on placement_targets (kind, match_key);

-- A mentor's experience. Company and position are separate columns: an entry
-- may name either or both. Verification defaults to self-reported and the API
-- never writes anything else — there is no employment verification process.
create table if not exists mentor_experience (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id) on delete cascade,
  company       text check (char_length(company) between 1 and 80),
  company_key   text,
  position      text check (char_length(position) between 1 and 80),
  position_key  text,
  kind          text check (kind in ('internship', 'full-time', 'part-time', 'research', 'project')),
  start_year    int,
  end_year      int,
  verification  text not null default 'self_reported' check (verification in ('self_reported', 'verified')),
  sort_order    int not null,
  check (company is not null or position is not null),
  check (end_year is null or start_year is null or end_year >= start_year)
);

create index if not exists mentor_experience_profile_idx on mentor_experience (profile_id);
create index if not exists mentor_experience_company_idx on mentor_experience (company_key);
create index if not exists mentor_experience_position_idx on mentor_experience (position_key);
