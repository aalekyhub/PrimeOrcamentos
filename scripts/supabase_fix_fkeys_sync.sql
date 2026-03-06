-- Script to resolve Async Synchronization Conflicts (409 and 400 errors)
-- 
-- Problema: Como o aplicativo Prime Orçamentos sincroniza dados em segundo plano de forma paralela (várias requisições HTTP ao mesmo tempo), 
-- muitas vezes um item filho (ex: plan_materials) chega no Supabase milissegundos ANTES do seu pai (ex: plans).
-- Isso causa um erro de "foreign key constraint violation" (fkey) e a nuvem rejeita os dados.
-- 
-- Solução: Como a integridade dos dados já é garantida pelo front-end (IndexedDB), precisamos relaxar essas foreign keys na nuvem
-- para que os registros possam chegar em qualquer ordem sem serem bloqueados.

-- 1. Remover Foreign Keys restritivas das tabelas de Planejamento (Plans)
ALTER TABLE IF EXISTS plan_materials DROP CONSTRAINT IF EXISTS plan_materials_plan_id_fkey;
ALTER TABLE IF EXISTS plan_labor DROP CONSTRAINT IF EXISTS plan_labor_plan_id_fkey;
ALTER TABLE IF EXISTS plan_indirects DROP CONSTRAINT IF EXISTS plan_indirects_plan_id_fkey;
ALTER TABLE IF EXISTS plan_services DROP CONSTRAINT IF EXISTS plan_services_plan_id_fkey;
ALTER TABLE IF EXISTS plan_taxes DROP CONSTRAINT IF EXISTS plan_taxes_plan_id_fkey;

-- 2. Remover Foreign Keys restritivas das tabelas de Obras (Works)
ALTER TABLE IF EXISTS work_materials DROP CONSTRAINT IF EXISTS work_materials_work_id_fkey;
ALTER TABLE IF EXISTS work_labor DROP CONSTRAINT IF EXISTS work_labor_work_id_fkey;
ALTER TABLE IF EXISTS work_indirects DROP CONSTRAINT IF EXISTS work_indirects_work_id_fkey;
ALTER TABLE IF EXISTS work_services DROP CONSTRAINT IF EXISTS work_services_work_id_fkey;
ALTER TABLE IF EXISTS work_taxes DROP CONSTRAINT IF EXISTS work_taxes_work_id_fkey;

-- 3. Garantir que o campo 'created_at' nunca bloqueie um insert/update se vier nulo do front-end
-- O erro 400 (Bad Request) no screenshot mostrou que plan_taxes reclamou do created_at.
-- O script anterior tentou arrumar isso, mas vamos garantir forçando o DROP NOT NULL e um valor padrão seguro.
ALTER TABLE IF EXISTS plans ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plans ALTER COLUMN created_at DROP NOT NULL;

-- (The 'works' table does not have a 'created_at' column in this schema version)

ALTER TABLE IF EXISTS plan_materials ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_materials ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS plan_labor ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_labor ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS plan_indirects ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_indirects ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS plan_taxes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_taxes ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_materials ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_materials ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_labor ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_labor ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_indirects ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_indirects ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_taxes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_taxes ALTER COLUMN created_at DROP NOT NULL;
