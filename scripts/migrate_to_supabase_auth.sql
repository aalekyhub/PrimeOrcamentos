-- MIGRAÇÃO PARA SUPABASE AUTH (PARTE A)
-- Cria a tabela `profiles` ligada a auth.users e as políticas de RLS dela.
-- NÃO mexe nas tabelas de negócio (customers, orders, transactions, etc.) ainda.
-- O app continua funcionando exatamente como hoje depois de rodar este bloco.
--
-- Ordem de execução recomendada:
--   1. Rode este arquivo inteiro (PARTE A) no SQL Editor do Supabase.
--   2. Rode scripts/migrate_users_to_auth.mjs (cria os logins reais).
--   3. Faça o deploy do código novo (Login/App/UserManager) e confirme que
--      todo mundo consegue logar com a própria senha de sempre.
--   4. Só depois de confirmar o passo 3, rode a PARTE B (no fim deste arquivo).

-- ============================================================
-- PARTE A — tabela profiles + RLS
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'operador')),
  permissions text[] not null default array['dashboard'],
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Função auxiliar: verifica se o usuário logado é admin, sem causar
-- recursão na política de RLS (roda com privilégios do dono da função).
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated"
  on profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write"
  on profiles for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- PARTE B — SÓ RODE DEPOIS DE CONFIRMAR O LOGIN NOVO FUNCIONANDO
-- Troca as políticas "All access" (using true) por "só autenticado".
-- Fecha o acesso anônimo que hoje expõe todos os dados do sistema.
-- ============================================================

-- do $$
-- declare
--   t text;
--   tables text[] := array[
--     'customers', 'catalog', 'orders', 'transactions', 'company', 'loans',
--     'plans', 'works', 'plan_services', 'work_services',
--     'plan_materials', 'work_materials', 'plan_labor', 'work_labor',
--     'plan_indirects', 'work_indirects', 'plan_taxes', 'work_taxes',
--     'serviflow_financial_accounts', 'serviflow_financial_categories',
--     'serviflow_account_entries', 'deleted_records'
--   ];
-- begin
--   foreach t in array tables
--   loop
--     if exists (select 1 from information_schema.tables where table_name = t) then
--       execute format('alter table %I enable row level security', t);
--       execute format('drop policy if exists "All access" on %I', t);
--       execute format(
--         'create policy "All access" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
--         t
--       );
--       raise notice 'Política atualizada para exigir autenticação em %', t;
--     end if;
--   end loop;
-- end $$;

-- ============================================================
-- PARTE C (opcional, rodar bem depois, quando tiver certeza que
-- ninguém mais depende da tabela antiga `users`)
-- ============================================================

-- drop policy if exists "All access" on users;
-- drop table if exists users;
