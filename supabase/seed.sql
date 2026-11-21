-- Bintang CRM sample data.
-- Usage: replace the email below with an existing (signed-up) user, then run in the SQL editor.
-- Safe to re-run: it clears that user's existing CRM records first.
do $$
declare
  v_email text := 'REPLACE_WITH_EMAIL';
  v_owner uuid;
  c_aisyah uuid; c_daniel uuid; c_mei uuid; c_ravi uuid; c_farah uuid; c_jason uuid; c_nurul uuid; c_hafiz uuid;
  now_ts timestamptz := now();
begin
  select id into v_owner from auth.users where lower(email) = lower(v_email);
  if v_owner is null then raise exception 'No user with email %', v_email; end if;

  delete from public.crm_contacts where owner_id = v_owner; -- cascades to cases, conversations, interactions

  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Aisyah Rahman',  'AR', 'bg-emerald-100 text-emerald-800', 'Kedai Kek Aisyah',     'aisyah@kekaisyah.my',     '+60 12-345 6789', 'whatsapp',  '+60 12-345 6789', 'You', to_char((now_ts - interval '4 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{VIP,Repeat customer}') returning id into c_aisyah;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Daniel Tan',     'DT', 'bg-sky-100 text-sky-800',         'Tan Logistics Sdn Bhd', 'daniel@tanlogistics.my',  '+60 16-220 4410', 'email',     'daniel@tanlogistics.my', 'You', to_char((now_ts - interval '25 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{B2B,Invoice}') returning id into c_daniel;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Lim Mei Ling',   'LM', 'bg-violet-100 text-violet-800',   'Studio Mei',            'meiling@studiomei.co',    '+60 17-889 1203', 'instagram', '@studiomei.kl', 'You', to_char((now_ts - interval '1 hour') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{Influencer}') returning id into c_mei;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Ravi Kumar',     'RK', 'bg-amber-100 text-amber-800',     'Ravi Auto Parts',       'ravi@raviauto.my',        '+60 19-554 7781', 'facebook',  'Ravi Kumar', 'You', to_char((now_ts - interval '3 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{New lead}') returning id into c_ravi;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Farah Hanim',    'FH', 'bg-rose-100 text-rose-800',       '',                      'farah.hanim@gmail.com',   '+60 11-2345 8899', 'whatsapp', '+60 11-2345 8899', 'You', to_char((now_ts - interval '1 day') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{Complaint}') returning id into c_farah;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Jason Wong',     'JW', 'bg-sky-100 text-sky-800',         'Wong & Co Events',      'jason@wongevents.my',     '+60 12-908 3321', 'instagram', '@wongevents', 'You', to_char((now_ts - interval '2 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{Wholesale,Follow-up}') returning id into c_jason;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Nurul Izzah',    'NI', 'bg-emerald-100 text-emerald-800', 'Sekolah Tadika Ceria',  'admin@tadikaceria.edu.my', '+60 13-771 0045', 'email',    'admin@tadikaceria.edu.my', 'You', to_char((now_ts - interval '3 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{B2B}') returning id into c_nurul;
  insert into public.crm_contacts (owner_id, name, initials, color, company, email, phone, primary_channel, handle, assigned, last_seen, tags) values
    (v_owner, 'Hafiz Osman',    'HO', 'bg-amber-100 text-amber-800',     '',                      'hafiz.osman@yahoo.com',   '+60 14-662 9010', 'facebook',  'Hafiz Osman', 'You', to_char((now_ts - interval '5 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{}') returning id into c_hafiz;

  insert into public.crm_conversations (owner_id, contact_id, channel, unread_count, last_activity, messages) values
    (v_owner, c_aisyah, 'whatsapp', 2, now_ts - interval '4 minutes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '40 minutes', 'text', 'Assalamualaikum, nak order 3 biji kek red velvet untuk Sabtu ni boleh?'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'agent',   'type', 'chat', 'timestamp', now_ts - interval '35 minutes', 'text', 'Waalaikumussalam Puan Aisyah! Boleh, Sabtu masih ada slot. Nak saiz 8 inci ke?', 'status', 'read'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '6 minutes',  'text', 'Ya 8 inci. Boleh hantar ke Shah Alam?'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '4 minutes',  'text', 'Berapa caj penghantaran ya?'))),
    (v_owner, c_daniel, 'email', 1, now_ts - interval '25 minutes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'email', 'subject', 'Invoice INV-2311 query', 'timestamp', now_ts - interval '25 minutes', 'text', 'Hi, the November invoice shows 40 cartons but we received 36. Could you check and send a revised invoice?'))),
    (v_owner, c_mei, 'instagram', 1, now_ts - interval '1 hour', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '2 hours', 'text', 'Love your new collection! Are you open to a collab for my December reel?'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'agent',   'type', 'chat', 'timestamp', now_ts - interval '90 minutes', 'text', 'Thank you Mei! Yes, we''d love that. What dates work for you?', 'status', 'read'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '1 hour', 'text', 'Maybe 6 or 7 Dec? I''ll send my rate card.'))),
    (v_owner, c_ravi, 'facebook', 1, now_ts - interval '3 hours', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '3 hours', 'text', 'Hello, do you supply in bulk? Looking for 200 units monthly.'))),
    (v_owner, c_farah, 'whatsapp', 0, now_ts - interval '1 day', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '26 hours', 'text', 'Parcel saya sampai rosak. Kotak penyek dan barang pecah.'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'agent',   'type', 'chat', 'timestamp', now_ts - interval '25 hours', 'text', 'Maaf sangat Cik Farah. Boleh hantar gambar barang? Kami akan ganti baru secepat mungkin.', 'status', 'read'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '24 hours', 'text', '📷 Photo'))),
    (v_owner, c_jason, 'instagram', 0, now_ts - interval '2 days', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'chat', 'timestamp', now_ts - interval '2 days 1 hour', 'text', 'Can I get wholesale pricing for 50 door gifts?'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'agent',   'type', 'chat', 'timestamp', now_ts - interval '2 days', 'text', 'Sure Jason, sending our wholesale sheet by email today.', 'status', 'delivered'))),
    (v_owner, c_nurul, 'email', 0, now_ts - interval '3 days', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'contact', 'type', 'email', 'subject', 'Quotation for year-end party', 'timestamp', now_ts - interval '3 days 2 hours', 'text', 'Assalamualaikum, boleh beri sebut harga untuk 120 pek makanan pada 12 Disember?'),
      jsonb_build_object('id', gen_random_uuid(), 'sender', 'agent',   'type', 'email', 'subject', 'Re: Quotation for year-end party', 'timestamp', now_ts - interval '3 days', 'text', 'Waalaikumussalam Puan Nurul, sebut harga dilampirkan. RM8.50 sepek termasuk penghantaran.')));

  insert into public.crm_cases (owner_id, title, contact_id, status, priority, channel_source, notes, created_at) values
    (v_owner, 'Delivery charge to Shah Alam',           c_aisyah, 'Open',                'Medium', 'whatsapp',  '{"Customer wants 3x 8-inch red velvet for Saturday"}', now_ts - interval '30 minutes'),
    (v_owner, 'Invoice INV-2311 carton mismatch',       c_daniel, 'In Progress',         'High',   'email',     '{"Warehouse confirms 36 cartons shipped","Revised invoice pending from finance"}', now_ts - interval '20 minutes'),
    (v_owner, 'Damaged parcel replacement',             c_farah,  'Waiting on Customer', 'High',   'whatsapp',  '{"Photo received","Waiting for preferred delivery date"}', now_ts - interval '1 day'),
    (v_owner, 'Bulk supply enquiry (200 units/month)',  c_ravi,   'Open',                'Medium', 'facebook',  '{}', now_ts - interval '3 hours'),
    (v_owner, 'December reel collaboration',            c_mei,    'In Progress',         'Low',    'instagram', '{"Proposed 6 or 7 Dec"}', now_ts - interval '1 hour'),
    (v_owner, 'Wholesale door gifts quotation',         c_jason,  'Resolved',            'Low',    'instagram', '{"Wholesale sheet sent"}', now_ts - interval '2 days'),
    (v_owner, 'Year-end party catering quote',          c_nurul,  'Resolved',            'Medium', 'email',     '{"Quoted RM8.50 per pack"}', now_ts - interval '3 days');

  insert into public.crm_interactions (owner_id, contact_id, type, summary, occurred_at, follow_up) values
    (v_owner, c_daniel, 'Call',    'Called Daniel about the carton mismatch; finance to issue revised invoice.', now_ts - interval '15 minutes', true),
    (v_owner, c_farah,  'Note',    'Courier claim lodged for damaged parcel (ref JNT-88213).', now_ts - interval '20 hours', true),
    (v_owner, c_mei,    'Meeting', 'Video call to plan December reel shot list.', now_ts - interval '50 minutes', false),
    (v_owner, c_ravi,   'Call',    'Intro call: needs pricing for 200 units monthly, delivery to Klang.', now_ts - interval '2 hours', true),
    (v_owner, c_nurul,  'Meeting', 'Tasting session at the tadika; menu confirmed.', now_ts - interval '2 days', false),
    (v_owner, c_hafiz,  'Note',    'Asked about opening hours during Ramadan; no order yet.', now_ts - interval '5 days', false);
end $$;
