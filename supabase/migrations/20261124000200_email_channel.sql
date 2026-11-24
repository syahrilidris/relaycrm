-- Bintang CRM: allow an Email (Resend) channel connection alongside Meta channels.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
     where conrelid = 'public.crm_channel_connections'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%provider%'
  loop
    execute format('alter table public.crm_channel_connections drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.crm_channel_connections
  add constraint crm_channel_connections_provider_check
  check (provider in ('whatsapp', 'facebook', 'instagram', 'email'));

create index if not exists crm_contacts_owner_email_idx on public.crm_contacts (owner_id, lower(email)) where email <> '';
