-- SCRIPT DEFINITIVO DE CORREÇÃO DO BANCO (RESET DAS TABELAS DE OBRAS)
-- ATENÇÃO: Este script irá APAGAR os dados locais problemáticos nessas tabelas para recriá-las com os tipos corretos.
-- Use apenas se os dados atuais estiverem "em branco" ou dando erro no Supabase.

-- 1. LIMPEZA TOTAL (FORÇA A RECRIÇÃO COM TIPOS DE ID TEXTO)
drop table if exists work_indirects cascade;
drop table if exists work_labor cascade;
drop table if exists work_materials cascade;
drop table if exists work_services cascade;
drop table if exists works cascade;
drop table if exists plan_indirects cascade;
drop table if exists plan_labor cascade;
drop table if exists plan_materials cascade;
drop table if exists plan_services cascade;
drop table if exists plans cascade;

-- 2. TABELAS DE PLANEJAMENTO (IDs como TEXT para aceitar PLAN-1234)
create table plans (
  id text primary key,
  name text not null,
  client_id text,
  address text,
  type text,
  status text default 'Planejamento',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  total_material_cost numeric default 0,
  total_labor_cost numeric default 0,
  total_indirect_cost numeric default 0,
  total_real_cost numeric default 0
);

create table plan_services (
  id text primary key,
  plan_id text references plans(id) on delete cascade,
  description text not null,
  unit text,
  quantity numeric default 0,
  unit_labor_cost numeric default 0,
  unit_material_cost numeric default 0,
  unit_indirect_cost numeric default 0,
  total_cost numeric default 0
);

create table plan_materials (
  id text primary key,
  plan_id text references plans(id) on delete cascade,
  plan_services_id text references plan_services(id) on delete cascade,
  material_name text not null,
  unit text,
  quantity numeric default 0,
  unit_cost numeric default 0,
  supplier text,
  total_cost numeric default 0
);

create table plan_labor (
  id text primary key,
  plan_id text references plans(id) on delete cascade,
  plan_services_id text references plan_services(id) on delete cascade,
  role text not null,
  cost_type text,
  unit text,
  unit_cost numeric default 0,
  quantity numeric default 0,
  charges_percent numeric default 0,
  total_cost numeric default 0
);

create table plan_indirects (
  id text primary key,
  plan_id text references plans(id) on delete cascade,
  category text,
  description text,
  value numeric default 0
);

-- 3. TABELAS DE GESTÃO DE OBRAS (REALIZADO)
create table works (
  id text primary key,
  plan_id text references plans(id) on delete set null,
  name text not null,
  client_id text,
  order_id text,
  address text,
  status text default 'Em Andamento',
  start_date timestamp with time zone default timezone('utc'::text, now()),
  end_date timestamp with time zone,
  total_material_cost numeric default 0,
  total_labor_cost numeric default 0,
  total_indirect_cost numeric default 0,
  total_real_cost numeric default 0
);

create table work_services (
  id text primary key,
  work_id text references works(id) on delete cascade,
  plan_service_id text,
  description text,
  unit text,
  quantity numeric default 0,
  unit_material_cost numeric default 0,
  unit_labor_cost numeric default 0,
  unit_indirect_cost numeric default 0,
  total_cost numeric default 0,
  status text default 'Pendente'
);

create table work_materials (
  id text primary key,
  work_id text references works(id) on delete cascade,
  work_services_id text references work_services(id) on delete cascade,
  material_name text,
  unit text,
  quantity numeric default 0,
  unit_cost numeric default 0,
  supplier text,
  purchase_date timestamp with time zone,
  invoice_number text,
  total_cost numeric default 0
);

create table work_labor (
  id text primary key,
  work_id text references works(id) on delete cascade,
  work_services_id text references work_services(id) on delete cascade,
  role text,
  worker_name text,
  cost_type text,
  unit text,
  unit_cost numeric default 0,
  quantity numeric default 0,
  charges_percent numeric default 0,
  total_cost numeric default 0
);

create table work_indirects (
  id text primary key,
  work_id text references works(id) on delete cascade,
  category text,
  description text,
  value numeric default 0,
  date timestamp with time zone
);

-- 4. POLÍTICAS DE ACESSO (RLS)
alter table plans enable row level security;
alter table plan_services enable row level security;
alter table plan_materials enable row level security;
alter table plan_labor enable row level security;
alter table plan_indirects enable row level security;
alter table works enable row level security;
alter table work_services enable row level security;
alter table work_materials enable row level security;
alter table work_labor enable row level security;
alter table work_indirects enable row level security;

create policy "All access" on plans for all using (true);
create policy "All access" on plan_services for all using (true);
create policy "All access" on plan_materials for all using (true);
create policy "All access" on plan_labor for all using (true);
create policy "All access" on plan_indirects for all using (true);
create policy "All access" on works for all using (true);
create policy "All access" on work_services for all using (true);
create policy "All access" on work_materials for all using (true);
create policy "All access" on work_labor for all using (true);
create policy "All access" on work_indirects for all using (true);
