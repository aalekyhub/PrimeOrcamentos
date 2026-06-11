-- 1. Criar tabelas financeiras caso não existam
CREATE TABLE IF NOT EXISTS serviflow_financial_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  "bankName" text,
  "initialBalance" numeric DEFAULT 0,
  "currentBalance" numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS serviflow_financial_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  nature text,
  icon text,
  color text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS serviflow_account_entries (
  id text PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL,
  amount numeric DEFAULT 0,
  category text,
  description text,
  "dueDate" text NOT NULL,
  "paymentDate" text,
  "customerId" text,
  "customerName" text,
  "supplierName" text,
  "orderId" text,
  "workId" text,
  "installmentNumber" integer,
  "totalInstallments" integer,
  attachment text,
  "attachmentName" text,
  "accountId" text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE serviflow_financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviflow_financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviflow_account_entries ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso Total (All Access)
DROP POLICY IF EXISTS "All access" ON serviflow_financial_accounts;
CREATE POLICY "All access" ON serviflow_financial_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "All access" ON serviflow_financial_categories;
CREATE POLICY "All access" ON serviflow_financial_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "All access" ON serviflow_account_entries;
CREATE POLICY "All access" ON serviflow_account_entries FOR ALL USING (true) WITH CHECK (true);
