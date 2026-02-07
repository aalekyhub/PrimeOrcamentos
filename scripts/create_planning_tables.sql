-- Create table for Planning Headers
create table if not exists plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  client_id text, -- linking to customers table (stored as text/uuid in json usually, but here likely a string id)
  address text,
  type text,
  status text default 'Planejamento',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create table for Planned Services (The simplified execution items)
create table if not exists plan_services (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references plans(id) on delete cascade,
  description text not null,
  unit text,
  quantity numeric default 0,
  unit_labor_cost numeric default 0,
  unit_material_cost numeric default 0,
  unit_indirect_cost numeric default 0,
  total_cost numeric generated always as (quantity * (unit_labor_cost + unit_material_cost + unit_indirect_cost)) stored
);

-- Detailed Resources: Materials
create table if not exists plan_materials (
  id uuid default uuid_generate_v4() primary key,
  plan_services_id uuid references plan_services(id) on delete cascade,
  material_name text not null,
  quantity numeric default 0,
  unit_cost numeric default 0,
  supplier text,
  total_cost numeric generated always as (quantity * unit_cost) stored
);

-- Detailed Resources: Labor
create table if not exists plan_labor (
  id uuid default uuid_generate_v4() primary key,
  plan_services_id uuid references plan_services(id) on delete cascade,
  role text not null,
  cost_type text, -- 'Hora', 'Diária'
  unit_cost numeric default 0,
  quantity numeric default 0,
  charges_percent numeric default 0,
  total_cost numeric generated always as (quantity * unit_cost * (1 + charges_percent/100)) stored
);

-- Detailed Resources: Indirects (Linked to Plan directly, not per service usually, but can be either. Spec implied Plan level or General)
-- Let's link to Plan for general indirects
create table if not exists plan_indirects (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references plans(id) on delete cascade,
  category text,
  description text,
  value numeric default 0
);

-- Enable RLS (Optional but recommended, adjusting per existing policy)
alter table plans enable row level security;
alter table plan_services enable row level security;
alter table plan_materials enable row level security;
alter table plan_labor enable row level security;
alter table plan_indirects enable row level security;

-- Create simple policies (allow all for authenticated/anon depending on app current state - keeping it open for dev)
create policy "Enable all access for all users" on plans for all using (true);
create policy "Enable all access for all users" on plan_services for all using (true);
create policy "Enable all access for all users" on plan_materials for all using (true);
create policy "Enable all access for all users" on plan_labor for all using (true);
create policy "Enable all access for all users" on plan_indirects for all using (true);
