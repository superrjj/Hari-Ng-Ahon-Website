create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  city text default 'Baguio City',
  avatar_url text,
  role text not null default 'cyclist' check (role in ('cyclist', 'admin')),
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  race_type text not null check (race_type in ('criterium', 'itt', 'ttt', 'road_race', 'fun_ride')),
  venue text not null,
  route_map_url text,
  elevation_profile_url text,
  event_date timestamptz not null,
  registration_deadline timestamptz not null,
  registration_fee numeric(10,2) not null default 0,
  prize_pool text,
  poster_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed')),
  created_at timestamptz default now()
);

create table if not exists public.race_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_name text not null,
  description text,
  slots int,
  created_at timestamptz default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid references public.race_categories(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'failed')),
  created_at timestamptz default now(),
  unique (user_id, event_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  proof_url text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_name text not null,
  rider_name text not null,
  team_name text,
  rank int not null,
  finish_time text,
  created_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  event_id uuid references public.events(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);
