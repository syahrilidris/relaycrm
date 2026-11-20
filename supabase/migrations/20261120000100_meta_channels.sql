-- Bintang CRM: Meta omnichannel (WhatsApp Cloud API, Messenger, Instagram DMs)

-- One row per connected Meta asset (WhatsApp phone number, Facebook Page, Instagram account).
create table if not exists public.crm_channel_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'facebook', 'instagram')),
  external_account_id text not null,
  display_name text not null default '',
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  last_error text,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_account_id),
  unique (owner_id, id)
);

-- Encrypted access tokens. No grants to anon/authenticated: only the server (service role) can read these.
create table if not exists public.crm_channel_secrets (
  connection_id uuid primary key references public.crm_channel_connections(id) on delete cascade,
  access_token_encrypted text not null,
  updated_at timestamptz not null default now()
);

-- Maps a Meta user (wa_id / PSID / IGSID) on a connection to a CRM contact.
create table if not exists public.crm_contact_identities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null,
  connection_id uuid not null references public.crm_channel_connections(id) on delete cascade,
  external_user_id text not null,
  created_at timestamptz not null default now(),
  unique (connection_id, external_user_id),
  constraint crm_contact_identities_contact_owner_fk foreign key (owner_id, contact_id) references public.crm_contacts(owner_id, id) on delete cascade
);

alter table public.crm_conversations add column if not exists connection_id uuid references public.crm_channel_connections(id) on delete set null;
alter table public.crm_conversations add column if not exists external_user_id text;

create unique index if not exists crm_conversations_connection_user_idx on public.crm_conversations (connection_id, external_user_id) where connection_id is not null;
create index if not exists crm_channel_connections_owner_idx on public.crm_channel_connections (owner_id, provider);
create index if not exists crm_contact_identities_contact_idx on public.crm_contact_identities (owner_id, contact_id);

alter table public.crm_channel_connections enable row level security;
alter table public.crm_channel_secrets enable row level security;
alter table public.crm_contact_identities enable row level security;

revoke all on public.crm_channel_connections, public.crm_channel_secrets, public.crm_contact_identities from anon, public;
revoke all on public.crm_channel_secrets from authenticated;
grant select, delete on public.crm_channel_connections to authenticated;
grant select on public.crm_contact_identities to authenticated;

create policy crm_channel_connections_select_own on public.crm_channel_connections for select to authenticated using ((select auth.uid()) = owner_id);
create policy crm_channel_connections_delete_own on public.crm_channel_connections for delete to authenticated using ((select auth.uid()) = owner_id);
create policy crm_contact_identities_select_own on public.crm_contact_identities for select to authenticated using ((select auth.uid()) = owner_id);

-- Atomically append a message to a conversation, skipping duplicates (Meta retries webhooks).
create or replace function public.crm_append_message(p_conversation_id uuid, p_message jsonb, p_unread_increment integer, p_activity timestamptz)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.crm_conversations c
     set messages = c.messages || jsonb_build_array(p_message),
         unread_count = c.unread_count + greatest(p_unread_increment, 0),
         last_activity = greatest(c.last_activity, p_activity),
         updated_at = now()
   where c.id = p_conversation_id
     and not (
       p_message ? 'external_id'
       and c.messages @> jsonb_build_array(jsonb_build_object('external_id', p_message->>'external_id'))
     );
  return found;
end;
$$;

-- Update delivery status (sent/delivered/read/failed) of an outbound message.
create or replace function public.crm_update_message_status(p_connection_id uuid, p_external_id text, p_status text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.crm_conversations c
     set messages = (
       select coalesce(jsonb_agg(case when m->>'external_id' = p_external_id then m || jsonb_build_object('status', p_status) else m end order by ord), '[]'::jsonb)
         from jsonb_array_elements(c.messages) with ordinality as t(m, ord)
     )
   where c.connection_id = p_connection_id
     and c.messages @> jsonb_build_array(jsonb_build_object('external_id', p_external_id));
$$;

revoke execute on function public.crm_append_message(uuid, jsonb, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.crm_update_message_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.crm_append_message(uuid, jsonb, integer, timestamptz) to service_role;
grant execute on function public.crm_update_message_status(uuid, text, text) to service_role;
