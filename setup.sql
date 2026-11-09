-- POLICE REPORT CENTER — Supabase SQL setup
-- Run in Supabase > SQL Editor, on the project chosen for this website.
-- Safe to rerun; existing rows and user edits are preserved.

create table if not exists public.report_hub_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.report_hub_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  subtitle text not null default '' check (length(subtitle) <= 300),
  deadline text not null default '' check (length(deadline) <= 80),
  kind text not null default 'report' check (kind in ('report','resource')),
  sort_order integer not null default 10 check (sort_order between 0 and 99999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_hub_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.report_hub_groups(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 800),
  url text not null check (length(url) <= 2000 and url ~* '^https://[^[:space:]]+$'),
  source text not null default 'เว็บไซต์' check (length(source) between 1 and 80),
  sort_order integer not null default 10 check (sort_order between 0 and 99999),
  is_required boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_hub_links_group_sort_idx on public.report_hub_links(group_id,sort_order);
create index if not exists report_hub_groups_sort_idx on public.report_hub_groups(sort_order);

-- RLS: public users can READ active content; only specifically authorized admins can WRITE.
alter table public.report_hub_admins enable row level security;
alter table public.report_hub_groups enable row level security;
alter table public.report_hub_links enable row level security;

revoke all on public.report_hub_admins from public, anon, authenticated;
revoke all on public.report_hub_groups from public, anon, authenticated;
revoke all on public.report_hub_links from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.report_hub_admins to anon, authenticated;
-- Anon has SELECT privilege only to evaluate policy subqueries; RLS exposes zero admin rows to anon.
grant select on public.report_hub_groups, public.report_hub_links to anon, authenticated;
grant insert, update, delete on public.report_hub_groups, public.report_hub_links to authenticated;

-- For idempotence when SQL is run a second time.
drop policy if exists "report_hub_admin_self_read" on public.report_hub_admins;
create policy "report_hub_admin_self_read" on public.report_hub_admins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "report_hub_group_read" on public.report_hub_groups;
create policy "report_hub_group_read" on public.report_hub_groups
  for select to anon, authenticated
  using (active or exists (
    select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())
  ));

drop policy if exists "report_hub_group_insert" on public.report_hub_groups;
create policy "report_hub_group_insert" on public.report_hub_groups
  for insert to authenticated with check (exists (
    select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())
  ));

drop policy if exists "report_hub_group_update" on public.report_hub_groups;
create policy "report_hub_group_update" on public.report_hub_groups
  for update to authenticated
  using (exists (select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())));

drop policy if exists "report_hub_group_delete" on public.report_hub_groups;
create policy "report_hub_group_delete" on public.report_hub_groups
  for delete to authenticated using (exists (
    select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())
  ));

drop policy if exists "report_hub_link_read" on public.report_hub_links;
create policy "report_hub_link_read" on public.report_hub_links
  for select to anon, authenticated
  using (
    (active and exists (select 1 from public.report_hub_groups g where g.id=group_id and g.active))
    or exists (select 1 from public.report_hub_admins a where a.user_id=(select auth.uid()))
  );

drop policy if exists "report_hub_link_insert" on public.report_hub_links;
create policy "report_hub_link_insert" on public.report_hub_links
  for insert to authenticated with check (exists (
    select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())
  ));

drop policy if exists "report_hub_link_update" on public.report_hub_links;
create policy "report_hub_link_update" on public.report_hub_links
  for update to authenticated
  using (exists (select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())));

drop policy if exists "report_hub_link_delete" on public.report_hub_links;
create policy "report_hub_link_delete" on public.report_hub_links
  for delete to authenticated using (exists (
    select 1 from public.report_hub_admins a where a.user_id = (select auth.uid())
  ));

-- Seed existing 6 report links + 1 Canva template (does NOT overwrite prior edits).
insert into public.report_hub_groups (id,title,subtitle,deadline,kind,sort_order,active) values
('10000000-0000-4000-8000-000000000001','กลุ่มที่ 1 · การตั้งจุด ว.43','รายการที่ 1–3 · รายงานทุกวัน','ก่อน 08.00 น.','report',10,true),
('10000000-0000-4000-8000-000000000002','กลุ่มที่ 2 · ผลการออกตรวจ ว.4','รายการที่ 4–6 · รายงานทุกวัน','ก่อน 09.00 น.','report',20,true),
('10000000-0000-4000-8000-000000000003','แม่แบบ Canva และเครื่องมือ','เมนูเพิ่มเติมสำหรับจัดทำสื่อประชาสัมพันธ์','','resource',30,true)
on conflict (id) do nothing;

insert into public.report_hub_links (id,group_id,title,description,url,source,sort_order,is_required,active) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','กรอกผลการตั้งจุด ว.43 / จับกุม','ธุรการ ป. หรือเจ้าหน้าที่ IT กรอกผลการตั้งจุดตรวจ ว.43 และผลจับกุมประจำวันแบบเรียลไทม์','https://docs.google.com/spreadsheets/d/1sHTAnegPqyMgQuZAXgp1Fth4K_lT_4u26l4lzGSg9S8/edit?usp=sharing','Google Sheets',10,true,true),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','ภาพการปล่อยแถว / ตั้งจุด ว.43','จัดทำภาพการปล่อยแถวและการตั้งจุด ว.43 ตามแม่แบบของ ภ.จว.ปราจีนบุรี','https://canva.link/qqe199j3geqd1d0','Canva',20,true,true),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','ภาพการจับกุมคดีเด่น','คัดเฉพาะภาพการจับกุมเด่น ๆ จากการตั้งจุด ว.43 (เฉพาะภาพ)','https://canva.link/2zporbca3vuxhoa','Canva',30,true,true),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','ผลการออก ว.4 ภาพรวมงาน ป.','บันทึกผลการออกตรวจของ ผกก. รอง ผกก.ป. สวป. และสายตรวจ ภ.จว.ปราจีนบุรี','https://docs.google.com/spreadsheets/d/1q1U_tM0ZwYcEniRd3E48ympTIbwiakYrvcTsjyfFmnA/edit?usp=sharing','Google Sheets',10,true,true),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','การออก ว.4 เวรนายตำรวจ อก.','รายงานจำนวนครั้งการออกตรวจของเวรนายตำรวจอำนวยการ ภ.จว.ปราจีนบุรี','https://docs.google.com/spreadsheets/d/1xpyCONP01jexq1qF2r6mzcQdKgtirYRgohYSD7d8WkY/edit?usp=sharing','Google Sheets',20,true,true),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','รายงานภาพการปฏิบัติ ภ.จว.','โฟลเดอร์กลางสำหรับส่งและจัดเก็บภาพรายงานผลการปฏิบัติประจำวัน','https://drive.google.com/drive/folders/1SSls67KTrmU42vvVzzgG9zBYjCdCeyCH','Google Drive',30,true,true),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000003','แม่แบบ Canva ทำภาพ จุดตรวจสัมพันธ์เวรอำนวยการ','ทางลัดเปิดแม่แบบสำหรับทำภาพประชาสัมพันธ์การออกตรวจสัมพันธ์ของเวรอำนวยการ','https://canva.link/gtr85mbqia37e65','Canva',10,false,true)
on conflict (id) do nothing;

-- FINISH ADMIN ENROLLMENT MANUALLY in a SEPARATE command AFTER creating
-- the user in Authentication > Users. Replace the email with your own:
-- insert into public.report_hub_admins(user_id)
-- select id from auth.users where email = 'your-admin-email@example.com'
-- on conflict (user_id) do nothing;
-- Verify membership with:
-- select a.user_id, u.email from public.report_hub_admins a
-- join auth.users u on u.id = a.user_id;
