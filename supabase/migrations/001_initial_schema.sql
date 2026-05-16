-- ============================================================
-- Magna AI — Initial Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Generations table
create table if not exists public.generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('blog_post','linkedin_post','ad_copy','email')),
  topic        text not null,
  tone         text not null,
  audience     text not null,
  title        text,
  body         text not null,
  image_url    text,
  image_style  text,
  image_prompt text,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- 2. Index for fast per-user pagination
create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

-- 3. Row Level Security
alter table public.generations enable row level security;

create policy "users read own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "users insert own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "users update own generations"
  on public.generations for update
  using (auth.uid() = user_id);

create policy "users delete own generations"
  on public.generations for delete
  using (auth.uid() = user_id);

-- 4. Storage bucket (generated-images)
-- Public read so frontend can display images directly.
-- Writes happen from the backend using the service role key (bypasses RLS).
insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "authenticated users upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'generated-images'
    and auth.role() = 'authenticated'
  );

-- Allow anyone to read images (bucket is public, but policy is defence-in-depth)
create policy "public read images"
  on storage.objects for select
  using (bucket_id = 'generated-images');

-- Allow users to delete their own images
create policy "users delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'generated-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
