-- SCRIPT DE CORREÇÃO TOTAL DE RLS (GESTÃO DE OBRAS)
-- Este script garante que todas as tabelas de Planejamento e Execução estejam acessíveis.

-- 1. Habilitar RLS em todas as tabelas
alter table if exists plans enable row level security;
alter table if exists works enable row level security;
alter table if exists plan_services enable row level security;
alter table if exists work_services enable row level security;
alter table if exists plan_materials enable row level security;
alter table if exists work_materials enable row level security;
alter table if exists plan_labor enable row level security;
alter table if exists work_labor enable row level security;
alter table if exists plan_indirects enable row level security;
alter table if exists work_indirects enable row level security;
alter table if exists plan_taxes enable row level security;
alter table if exists work_taxes enable row level security;
alter table if exists users enable row level security;
alter table if exists customers enable row level security;
alter table if exists catalog enable row level security;
alter table if exists orders enable row level security;
alter table if exists transactions enable row level security;
alter table if exists loans enable row level security;

-- 2. Criar políticas de "Acesso Total" para todas as tabelas
do $$ 
declare
  t text;
  tables text[] := array[
    'plans', 'works', 'plan_services', 'work_services', 
    'plan_materials', 'work_materials', 'plan_labor', 'work_labor', 
    'plan_indirects', 'work_indirects', 'plan_taxes', 'work_taxes',
    'users', 'customers', 'catalog', 'orders', 'transactions', 'loans'
  ];
begin
  foreach t in array tables
  loop
    if exists (select 1 from information_schema.tables where table_name = t) then
      -- Remover política antiga se existir
      execute format('drop policy if exists "All access" on %I', t);
      -- Criar nova política liberal
      execute format('create policy "All access" on %I for all using (true) with check (true)', t);
      raise notice 'Política "All access" criada para a tabela %', t;
    end if;
  end loop;
end $$;
