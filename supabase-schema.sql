-- ═══════════════════════════════════════════════════════════════════════════
-- AstroVision — Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Observations (the core science table) ─────────────────────────────────
create table if not exists observations (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  created_at    timestamptz default now(),

  -- Image
  image_url     text,
  image_hash    text,

  -- Pipeline results
  pipeline_version  text not null default '1.0.0',
  tier              smallint not null default 3,  -- 1=full, 2=partial, 3=vlm-only

  -- Coordinates (null if plate-solving failed)
  ra            double precision,
  dec_coord     double precision,  -- "dec" is reserved in SQL
  field_width   double precision,
  field_height  double precision,
  orientation   double precision,
  pixscale      double precision,

  -- Morphology (JSONB for flexibility)
  morphology    jsonb,
  image_quality jsonb,

  -- Catalog cross-reference
  catalog_matches   jsonb default '[]'::jsonb,
  is_uncatalogued   boolean default false,

  -- Change detection
  change_detection  jsonb,
  visual_comparison jsonb,

  -- Archival images
  archival_images   jsonb default '[]'::jsonb,

  -- AI synthesis
  synthesis         jsonb,

  -- Discovery score
  discovery_score       smallint default 0,
  discovery_tier        text default 'routine',
  discovery_score_breakdown jsonb,

  -- Model versions for reproducibility
  model_versions    jsonb default '{}'::jsonb,

  -- User question that triggered the analysis
  user_question     text
);

create index idx_observations_user on observations(user_id);
create index idx_observations_score on observations(discovery_score desc);
create index idx_observations_coords on observations(ra, dec_coord) where ra is not null;
create index idx_observations_tier on observations(discovery_tier);

-- ── Community Posts ───────────────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  author        text not null default 'Astronomer',
  text          text not null,
  image         text,
  observation_id uuid references observations(id),
  likes         int default 0,
  liked_by      text[] default '{}',
  created_at    timestamptz default now()
);

create index idx_posts_user on posts(user_id);
create index idx_posts_observation on posts(observation_id) where observation_id is not null;
create index idx_posts_created on posts(created_at desc);

-- ── Comments ──────────────────────────────────────────────────────────────
create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references posts(id) on delete cascade,
  parent_id     uuid references comments(id) on delete cascade,
  user_id       text not null,
  author        text not null default 'Astronomer',
  text          text not null,
  likes         int default 0,
  liked_by      text[] default '{}',
  created_at    timestamptz default now()
);

create index idx_comments_post on comments(post_id);
create index idx_comments_parent on comments(parent_id);

-- ── Peer Verifications ────────────────────────────────────────────────────
create table if not exists verifications (
  id              uuid primary key default gen_random_uuid(),
  observation_id  uuid not null references observations(id) on delete cascade,
  user_id         text not null,
  confidence      smallint not null check (confidence between 0 and 100),
  notes           text,
  created_at      timestamptz default now(),
  unique(observation_id, user_id)
);

create index idx_verifications_observation on verifications(observation_id);

-- ── User Profiles ─────────────────────────────────────────────────────────
create table if not exists profiles (
  id              text primary key,
  username        text not null,
  bio             text default 'Exploring the cosmos',
  avatar_url      text,
  role            text default 'researcher' check (role in ('researcher', 'reviewer', 'admin')),
  observation_count int default 0,
  discovery_count   int default 0,
  verification_score int default 0,
  created_at      timestamptz default now()
);

-- ── Storage Buckets (run in Supabase dashboard or via API) ───────────────
-- create bucket: observation-images (public)
-- create bucket: community-images (public)
