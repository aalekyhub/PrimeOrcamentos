-- REFORÇO DE RLS: distingue admin x operador no banco, no mesmo padrão que
-- a interface já aplica (criar é liberado para qualquer autenticado; editar
-- e excluir um registro já existente exige admin).
--
-- Pré-requisito: a função is_admin() já existe (criada em
-- scripts/migrate_to_supabase_auth.sql, Parte A) e a tabela `profiles` já
-- está populada e protegida.
--
-- Escopo desta rodada: tabelas do módulo de Gestão (clientes, ordens de
-- serviço/orçamentos, empresa, financeiro). Tabelas de Planejamento/Obras
-- (plans, works e afins) ficam para quando chegarmos nesse módulo.

-- ============================================================
-- company — só admin escreve; leitura livre para autenticado
-- ============================================================
drop policy if exists "All access" on company;
create policy "company_select_authenticated"
  on company for select
  using (auth.role() = 'authenticated');
create policy "company_admin_write"
  on company for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- serviflow_financial_accounts / serviflow_financial_categories
-- (contas bancárias e categorias) — só admin escreve
-- ============================================================
drop policy if exists "All access" on serviflow_financial_accounts;
create policy "financial_accounts_select_authenticated"
  on serviflow_financial_accounts for select
  using (auth.role() = 'authenticated');
create policy "financial_accounts_admin_write"
  on serviflow_financial_accounts for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "All access" on serviflow_financial_categories;
create policy "financial_categories_select_authenticated"
  on serviflow_financial_categories for select
  using (auth.role() = 'authenticated');
create policy "financial_categories_admin_write"
  on serviflow_financial_categories for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- customers — criar é liberado; editar/excluir cliente já
-- cadastrado exige admin
-- ============================================================
drop policy if exists "All access" on customers;
create policy "customers_select_authenticated"
  on customers for select
  using (auth.role() = 'authenticated');
create policy "customers_insert_authenticated"
  on customers for insert
  with check (auth.role() = 'authenticated');
create policy "customers_admin_update"
  on customers for update
  using (is_admin())
  with check (is_admin());
create policy "customers_admin_delete"
  on customers for delete
  using (is_admin());

-- ============================================================
-- orders — usado por Orçamentos, O.S. Obra e O.S. Equip. Criar é
-- liberado; editar/excluir um orçamento ou O.S. já salvo exige admin
-- ============================================================
drop policy if exists "All access" on orders;
create policy "orders_select_authenticated"
  on orders for select
  using (auth.role() = 'authenticated');
create policy "orders_insert_authenticated"
  on orders for insert
  with check (auth.role() = 'authenticated');
create policy "orders_admin_update"
  on orders for update
  using (is_admin())
  with check (is_admin());
create policy "orders_admin_delete"
  on orders for delete
  using (is_admin());

-- ============================================================
-- serviflow_account_entries — lançamentos financeiros. Criar e
-- editar (ex: dar baixa) são liberados; só excluir um lançamento
-- já realizado exige admin
-- ============================================================
drop policy if exists "All access" on serviflow_account_entries;
create policy "account_entries_select_authenticated"
  on serviflow_account_entries for select
  using (auth.role() = 'authenticated');
create policy "account_entries_insert_authenticated"
  on serviflow_account_entries for insert
  with check (auth.role() = 'authenticated');
create policy "account_entries_update_authenticated"
  on serviflow_account_entries for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "account_entries_admin_delete"
  on serviflow_account_entries for delete
  using (is_admin());
