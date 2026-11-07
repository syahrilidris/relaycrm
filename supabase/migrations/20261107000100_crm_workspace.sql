create sequence if not exists public.crm_case_number_seq start with 2049 increment by 1;

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  initials text not null default '',
  color text not null default 'bg-slate-100 text-slate-700',
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  primary_channel text not null check (primary_channel in ('whatsapp', 'email', 'instagram', 'facebook', 'webchat')),
  handle text not null default '',
  assigned text not null default '',
  last_seen text not null default '',
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table if not exists public.crm_cases (
  id text primary key default ('CS-' || nextval('public.crm_case_number_seq')::text),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  contact_id uuid not null,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Waiting on Customer', 'Resolved')),
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  channel_source text not null check (channel_source in ('whatsapp', 'email', 'instagram', 'facebook', 'webchat')),
  notes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_cases_contact_owner_fk foreign key (owner_id, contact_id) references public.crm_contacts(owner_id, id) on delete cascade
);

create table if not exists public.crm_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null,
  channel text not null check (channel in ('whatsapp', 'email', 'instagram', 'facebook', 'webchat')),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  unread_count integer not null default 0 check (unread_count >= 0),
  last_activity timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_conversations_contact_owner_fk foreign key (owner_id, contact_id) references public.crm_contacts(owner_id, id) on delete cascade,
  unique (owner_id, id)
);

create table if not exists public.crm_interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null,
  type text not null check (type in ('Call', 'Meeting', 'Note')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  follow_up boolean not null default false,
  created_at timestamptz not null default now(),
  constraint crm_interactions_contact_owner_fk foreign key (owner_id, contact_id) references public.crm_contacts(owner_id, id) on delete cascade
);

create index if not exists crm_contacts_owner_name_idx on public.crm_contacts (owner_id, name);
create index if not exists crm_cases_owner_status_idx on public.crm_cases (owner_id, status, created_at desc);
create index if not exists crm_cases_contact_idx on public.crm_cases (owner_id, contact_id);
create index if not exists crm_conversations_owner_activity_idx on public.crm_conversations (owner_id, last_activity desc);
create index if not exists crm_conversations_contact_idx on public.crm_conversations (owner_id, contact_id);
create index if not exists crm_interactions_contact_idx on public.crm_interactions (owner_id, contact_id, occurred_at desc);

alter table public.crm_contacts enable row level security;
alter table public.crm_cases enable row level security;
alter table public.crm_conversations enable row level security;
alter table public.crm_interactions enable row level security;

revoke all on public.crm_contacts, public.crm_cases, public.crm_conversations, public.crm_interactions from anon, public;
grant select, insert, update, delete on public.crm_contacts, public.crm_cases, public.crm_conversations, public.crm_interactions to authenticated;
revoke all on sequence public.crm_case_number_seq from anon, public;
grant usage, select on sequence public.crm_case_number_seq to authenticated;

create policy crm_contacts_select_own on public.crm_contacts for select to authenticated using ((select auth.uid()) = owner_id);
create policy crm_contacts_insert_own on public.crm_contacts for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy crm_contacts_update_own on public.crm_contacts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy crm_contacts_delete_own on public.crm_contacts for delete to authenticated using ((select auth.uid()) = owner_id);

create policy crm_cases_select_own on public.crm_cases for select to authenticated using ((select auth.uid()) = owner_id);
create policy crm_cases_insert_own on public.crm_cases for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy crm_cases_update_own on public.crm_cases for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy crm_cases_delete_own on public.crm_cases for delete to authenticated using ((select auth.uid()) = owner_id);

create policy crm_conversations_select_own on public.crm_conversations for select to authenticated using ((select auth.uid()) = owner_id);
create policy crm_conversations_insert_own on public.crm_conversations for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy crm_conversations_update_own on public.crm_conversations for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy crm_conversations_delete_own on public.crm_conversations for delete to authenticated using ((select auth.uid()) = owner_id);

create policy crm_interactions_select_own on public.crm_interactions for select to authenticated using ((select auth.uid()) = owner_id);
create policy crm_interactions_insert_own on public.crm_interactions for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy crm_interactions_update_own on public.crm_interactions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy crm_interactions_delete_own on public.crm_interactions for delete to authenticated using ((select auth.uid()) = owner_id);
