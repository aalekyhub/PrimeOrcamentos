-- Script to fix missing columns and constraints in Supabase
-- This aligns the backend schema with the frontend Typescript interfaces

-- 1. Fix missing 'client_name' in plans and works
ALTER TABLE IF EXISTS plans ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE IF EXISTS works ADD COLUMN IF NOT EXISTS client_name text;

-- 2. Fix linking columns between Work (Realized) and Plan (Projected)
ALTER TABLE IF EXISTS work_services ADD COLUMN IF NOT EXISTS plan_service_id uuid;
ALTER TABLE IF EXISTS work_materials ADD COLUMN IF NOT EXISTS plan_material_id uuid;
ALTER TABLE IF EXISTS work_labor ADD COLUMN IF NOT EXISTS plan_labor_id uuid;
ALTER TABLE IF EXISTS work_indirects ADD COLUMN IF NOT EXISTS plan_indirect_id uuid;
ALTER TABLE IF EXISTS work_taxes ADD COLUMN IF NOT EXISTS plan_tax_id uuid;

-- 3. Fix missing 'unit' columns added recently for parity
ALTER TABLE IF EXISTS plan_materials ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE IF EXISTS plan_labor ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE IF EXISTS work_materials ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE IF EXISTS work_labor ADD COLUMN IF NOT EXISTS unit text;

-- 4. Fix missing 'plan_services_id' and 'work_services_id' relationships
ALTER TABLE IF EXISTS plan_materials ADD COLUMN IF NOT EXISTS plan_services_id uuid;
ALTER TABLE IF EXISTS plan_labor ADD COLUMN IF NOT EXISTS plan_services_id uuid;
ALTER TABLE IF EXISTS work_materials ADD COLUMN IF NOT EXISTS work_services_id uuid;
ALTER TABLE IF EXISTS work_labor ADD COLUMN IF NOT EXISTS work_services_id uuid;

-- 5. Fix 'worker_name' and 'date' in execution records
ALTER TABLE IF EXISTS work_labor ADD COLUMN IF NOT EXISTS worker_name text;
ALTER TABLE IF EXISTS work_indirects ADD COLUMN IF NOT EXISTS date text;

-- 6. Fix 'created_at' not-null constraints that cause insert failures when the frontend doesn't send them
-- First set a default value, then optionally drop the not null constraint if they still fail
ALTER TABLE IF EXISTS plan_taxes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_taxes ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_taxes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_taxes ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS plan_materials ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_materials ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS plan_labor ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_labor ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS plan_indirects ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS plan_indirects ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_materials ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_materials ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_labor ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_labor ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE IF EXISTS work_indirects ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS work_indirects ALTER COLUMN created_at DROP NOT NULL;

-- 7. Add 'order_id' to Works if missing
ALTER TABLE IF EXISTS works ADD COLUMN IF NOT EXISTS order_id text;
