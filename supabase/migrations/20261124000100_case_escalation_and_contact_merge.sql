-- Bintang CRM: case escalation + merging duplicate contacts (one person on several channels).

-- 1. Escalation on support cases (0 = none, 1 = senior staff, 2 = manager).
alter table public.crm_cases
  add column if not exists escalation_level smallint not null default 0,
  add column if not exists escalation_reason text,
  add column if not exists escalated_at timestamptz;

do $$ begin
  alter table public.crm_cases add constraint crm_cases_escalation_level_check check (escalation_level between 0 and 2);
exception when duplicate_object then null;
end $$;

create index if not exists crm_cases_escalated_idx on public.crm_cases (owner_id, escalation_level) where escalation_level > 0;

-- 2. Merge two contacts owned by the signed-in user into one.
-- Everything linked to the duplicate (channel identities, conversations, cases, interactions)
-- moves to the primary contact, blank fields are filled from the duplicate, tags are combined,
-- and the duplicate is deleted. Runs as one transaction.
create or replace function public.crm_merge_contacts(p_primary uuid, p_duplicate uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_primary public.crm_contacts;
  v_duplicate public.crm_contacts;
begin
  if v_owner is null then
    raise exception 'You need to be signed in.' using errcode = '42501';
  end if;
  if p_primary = p_duplicate then
    raise exception 'Choose two different contacts.' using errcode = '22023';
  end if;

  select * into v_primary from public.crm_contacts where id = p_primary and owner_id = v_owner for update;
  select * into v_duplicate from public.crm_contacts where id = p_duplicate and owner_id = v_owner for update;
  if v_primary.id is null or v_duplicate.id is null then
    raise exception 'That contact could not be found.' using errcode = 'P0002';
  end if;

  update public.crm_contact_identities set contact_id = p_primary where owner_id = v_owner and contact_id = p_duplicate;
  update public.crm_conversations set contact_id = p_primary where owner_id = v_owner and contact_id = p_duplicate;
  update public.crm_cases set contact_id = p_primary where owner_id = v_owner and contact_id = p_duplicate;
  update public.crm_interactions set contact_id = p_primary where owner_id = v_owner and contact_id = p_duplicate;

  update public.crm_contacts set
    company = coalesce(nullif(company, ''), v_duplicate.company),
    email = coalesce(nullif(email, ''), v_duplicate.email),
    phone = coalesce(nullif(phone, ''), v_duplicate.phone),
    handle = coalesce(nullif(handle, ''), v_duplicate.handle),
    assigned = coalesce(nullif(assigned, ''), v_duplicate.assigned),
    tags = (select coalesce(array_agg(distinct tag), '{}'::text[]) from unnest(tags || v_duplicate.tags) as tag),
    updated_at = now()
  where id = p_primary and owner_id = v_owner;

  delete from public.crm_contacts where id = p_duplicate and owner_id = v_owner;
  return p_primary;
end;
$$;

revoke all on function public.crm_merge_contacts(uuid, uuid) from public, anon;
grant execute on function public.crm_merge_contacts(uuid, uuid) to authenticated;
