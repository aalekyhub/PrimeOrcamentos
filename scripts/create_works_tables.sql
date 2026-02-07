-- TABELA DE CABEÇALHO DA OBRA (REALIZADO)
create table if not exists works (
  id text primary key,
  name text not null,
  client_id text,
  order_id text, -- Link to the approved Budget/Order
  plan_id text, -- Link to the original Plan
  address text,
  status text default 'Em Andamento', -- 'Em Andamento', 'Concluída', 'Pausada'
  start_date timestamp with time zone default timezone('utc'::text, now()),
  end_date timestamp with time zone,
  
  -- Totais Realizados (Acumulados)
  total_material_cost numeric default 0,
  total_labor_cost numeric default 0,
  total_indirect_cost numeric default 0,
  total_real_cost numeric default 0
);

-- TABELA DE SERVIÇOS EXECUTADOS
create table if not exists work_services (
  id text primary key,
  work_id text references works(id) on delete cascade,
  description text,
  unit text,
  quantity numeric default 0, -- Quantidade executada
  unit_material_cost numeric default 0, -- Custo unitário real
  unit_labor_cost numeric default 0,
  unit_indirect_cost numeric default 0,
  total_cost numeric default 0,
  status text default 'Pendente' -- 'Pendente', 'Em Execução', 'Concluído'
);

-- TABELA DE MATERIAIS GASTOS (REALIZADO)
create table if not exists work_materials (
  id text primary key,
  work_services_id text references work_services(id) on delete cascade,
  material_name text,
  quantity numeric default 0,
  unit_cost numeric default 0,
  supplier text,
  purchase_date timestamp with time zone,
  invoice_number text, -- Nota Fiscal
  total_cost numeric default 0
);

-- TABELA DE MÃO DE OBRA UTILIZADA (REALIZADO)
create table if not exists work_labor (
  id text primary key,
  work_services_id text references work_services(id) on delete cascade,
  role text,
  worker_name text, -- Nome do funcionário/prestador
  cost_type text,
  unit_cost numeric default 0,
  quantity numeric default 0, -- Horas/Dias reais
  total_cost numeric default 0
);

-- TABELA DE CUSTOS INDIRETOS REAIS
create table if not exists work_indirects (
  id text primary key,
  work_id text references works(id) on delete cascade,
  category text, 
  description text,
  value numeric default 0,
  date timestamp with time zone
);

-- Enable RLS (Optional, mirroring previous setup)
alter table works enable row level security;
alter table work_services enable row level security;
alter table work_materials enable row level security;
alter table work_labor enable row level security;
alter table work_indirects enable row level security;

create policy "Enable all access for all users" on works for all using (true);
create policy "Enable all access for all users" on work_services for all using (true);
create policy "Enable all access for all users" on work_materials for all using (true);
create policy "Enable all access for all users" on work_labor for all using (true);
create policy "Enable all access for all users" on work_indirects for all using (true);
