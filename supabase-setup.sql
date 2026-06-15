-- Run this entire file in Supabase Dashboard > SQL Editor.
-- It is safe to re-run when updating permissions.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'creator' check (role in ('creator', 'brand')),
  profile_data jsonb not null default '{}'::jsonb,
  avatar_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  profile_completed_at timestamptz,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists avatar_url text;
alter table public.profiles
add column if not exists is_published boolean not null default false;
alter table public.profiles
add column if not exists published_at timestamptz;

alter table public.profiles enable row level security;

-- Data API privileges are separate from RLS policies. These grants are
-- required because automatic table exposure was disabled at project setup.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
to authenticated
using (
  public.is_admin()
);

-- Users may update profile content but can never grant themselves admin access.
revoke update on public.profiles from authenticated;
grant update (
  email,
  display_name,
  role,
  profile_data,
  avatar_url,
  is_published,
  published_at,
  profile_completed_at,
  updated_at
) on public.profiles to authenticated;

-- Public profile images. Upload and update are restricted to each user's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  384000,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Backfill users who registered before this trigger was created.
insert into public.profiles (id, email, display_name)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')
from auth.users
on conflict (id) do update set email = excluded.email;

-- Re-apply the administrator flag after all existing users are backfilled.
update public.profiles
set is_admin = true
where lower(email) = lower('willia098888@gmail.com');

-- Collaboration requests: sender creates, receiver responds, both can view.
create table if not exists public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint sender_is_not_receiver check (sender_id <> receiver_id),
  constraint one_active_request unique (sender_id, receiver_id)
);

alter table public.collaboration_requests enable row level security;
grant select, insert on public.collaboration_requests to authenticated;
revoke update on public.collaboration_requests from authenticated;
grant update (status, responded_at) on public.collaboration_requests to authenticated;

create or replace function public.can_send_collaboration_request(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles sender
    join public.profiles receiver on receiver.id = target_id
    where sender.id = auth.uid()
      and receiver.id <> sender.id
      and receiver.is_published = true
      and sender.role <> receiver.role
  );
$$;

revoke all on function public.can_send_collaboration_request(uuid) from public;
grant execute on function public.can_send_collaboration_request(uuid) to authenticated;

drop policy if exists "Participants can view requests" on public.collaboration_requests;
create policy "Participants can view requests"
on public.collaboration_requests for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can send requests" on public.collaboration_requests;
create policy "Users can send requests"
on public.collaboration_requests for insert
to authenticated
with check (
  sender_id = auth.uid()
  and receiver_id <> auth.uid()
  and public.can_send_collaboration_request(receiver_id)
);

drop policy if exists "Receivers can respond" on public.collaboration_requests;
create policy "Receivers can respond"
on public.collaboration_requests for update
to authenticated
using (receiver_id = auth.uid())
with check (receiver_id = auth.uid());

drop policy if exists "Admins can read all requests" on public.collaboration_requests;
create policy "Admins can read all requests"
on public.collaboration_requests for select
to authenticated
using (public.is_admin());

-- Return matching candidates without exposing private email addresses.
create or replace function public.get_match_profiles(requested_role text)
returns table (
  id uuid,
  display_name text,
  role text,
  profile_data jsonb,
  avatar_url text,
  profile_completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.display_name,
    profile.role,
    profile.profile_data,
    profile.avatar_url,
    profile.profile_completed_at
  from public.profiles profile
  where auth.uid() is not null
    and profile.id <> auth.uid()
    and profile.role = requested_role
    and profile.is_published = true
  order by profile.updated_at desc;
$$;

revoke all on function public.get_match_profiles(text) from public;
grant execute on function public.get_match_profiles(text) to authenticated;

-- Public directories expose published content but remove private contact fields.
create or replace function public.get_published_profiles(requested_role text)
returns table (
  id uuid,
  display_name text,
  role text,
  profile_data jsonb,
  avatar_url text,
  is_published boolean,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.display_name,
    profile.role,
    profile.profile_data - 'email' - 'line' - 'contact',
    profile.avatar_url,
    profile.is_published,
    profile.published_at
  from public.profiles profile
  where profile.role = requested_role
    and profile.is_published = true
  order by profile.published_at desc nulls last;
$$;

revoke all on function public.get_published_profiles(text) from public;
grant execute on function public.get_published_profiles(text) to anon, authenticated;

-- Return both inbox and sent requests with the other party's public identity.
create or replace function public.get_my_collaboration_requests()
returns table (
  id uuid,
  direction text,
  other_id uuid,
  other_name text,
  other_avatar text,
  other_email text,
  message text,
  status text,
  created_at timestamptz,
  responded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    case when request.receiver_id = auth.uid() then 'received' else 'sent' end,
    other_profile.id,
    other_profile.display_name,
    other_profile.avatar_url,
    case when request.status = 'accepted' then other_profile.email else null end,
    request.message,
    request.status,
    request.created_at,
    request.responded_at
  from public.collaboration_requests request
  join public.profiles other_profile
    on other_profile.id = case
      when request.receiver_id = auth.uid() then request.sender_id
      else request.receiver_id
    end
  where request.sender_id = auth.uid() or request.receiver_id = auth.uid()
  order by request.created_at desc;
$$;

revoke all on function public.get_my_collaboration_requests() from public;
grant execute on function public.get_my_collaboration_requests() to authenticated;
