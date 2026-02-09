
export enum OrderStatus {
  DRAFT = 'Rascunho',
  PENDING = 'Pendente',
  APPROVED = 'Aprovado',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluído',
  CANCELLED = 'Cancelado',
  PAID = 'Pago'
}

export type PersonType = 'PF' | 'PJ';

export interface MeasurementUnit {
  label: string;
  value: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'operador';
  permissions?: string[]; // IDs das abas permitidas
  createdAt: string;
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  logo?: string; // Base64 image
  nameFontSize: number; // Font size in pixels
  logoSize: number; // Logo height in pixels
  customUnits: MeasurementUnit[];
  defaultProposalValidity?: number; // Days
  descriptionFontSize?: number; // Font size for technical description
  itemsFontSize?: number; // Font size for items table
  printMarginTop?: number;
  printMarginBottom?: number;
}

export interface Customer {
  id: string;
  type: PersonType;
  name: string;
  tradeName?: string;
  email: string;
  phone: string;
  whatsapp: string;
  document: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  createdAt: string;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  category: string;
}

export interface ServiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  type: 'Serviço' | 'Material';
  actualValue?: number; // Valor Realizado (Total) - Keeping for compatibility if needed, but adding granular fields
  actualQuantity?: number;
  actualUnitPrice?: number;
}

export interface DescriptionBlock {
  id: string;
  type: 'text' | 'image' | 'page-break';
  content: string;
}

export interface ServiceOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  description: string;
  serviceDescription?: string;
  descriptionBlocks?: DescriptionBlock[]; // Novo campo para descrição rica
  paymentTerms?: string;
  deliveryTime?: string;
  paymentEntryPercent?: number; // Persisting the entry percentage
  status: OrderStatus;
  items: ServiceItem[];
  images?: string[];
  signature?: string; // Base64 signature image
  createdAt: string;
  dueDate: string;
  totalAmount: number;
  taxRate?: number; // Impostos (%)
  bdiRate?: number; // BDI (%)
  equipmentBrand?: string;
  equipmentModel?: string;
  equipmentSerialNumber?: string;
  osType?: 'EQUIPMENT' | 'WORK';
  contractPrice?: number; // Valor fechado com o cliente
  costItems?: ServiceItem[]; // Itens de custo (separados do escopo)
  originBudgetId?: string; // ID do orçamento que gerou esta OS
}

export type RecurrenceFrequency = 'NONE' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  description: string;
  relatedOrderId?: string;
  isRecurring?: boolean;
  frequency?: RecurrenceFrequency;
  installments?: number; // Total installments for loans/purchases
  currentInstallment?: number; // Current installment number
}

export interface Loan {
  id: string;
  bankName: string;
  totalAmount: number;
  remainingAmount: number;
  startDate: string;
  installmentsCount: number;
  installmentsPaid: number;
  installmentValue: number;
  interestRate?: number;
  description: string;
}

// --- NEW MODULE: Work Planning ---

export interface PlannedMaterial {
  id: string;
  plan_id?: string; // Link to plan
  plan_services_id?: string; // Optional link to a specific service
  material_name: string;
  quantity: number;
  unit_cost: number;
  supplier?: string;
  total_cost: number;
}

export interface PlannedLabor {
  id: string;
  plan_id?: string; // Link to plan
  plan_services_id?: string; // Optional link
  role: string;
  cost_type: 'Hora' | 'Diária' | 'Empreitada';
  unit_cost: number;
  quantity: number;
  charges_percent: number;
  total_cost: number;
}

export interface PlannedIndirect {
  id: string;
  plan_id?: string; // Link to plan
  category: string;
  description: string;
  value: number;
}

export interface PlannedService {
  id: string;
  plan_id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_labor_cost: number;
  unit_material_cost: number;
  unit_indirect_cost: number;
  total_cost: number;
  // Optional detailed arrays if we load them nested
  materials?: PlannedMaterial[];
  labor?: PlannedLabor[];
}

export interface PlanningHeader {
  id: string;
  name: string;
  client_id: string;
  client_name?: string; // For display
  address: string;
  type: string;
  status: 'Planejamento' | 'Concluído' | 'Cancelado';
  created_at: string;
  // Totals for summary
  total_material_cost?: number;
  total_labor_cost?: number;
  total_indirect_cost?: number;
  total_real_cost?: number;
}

// --- NEW MODULE: Works Management (Realized) ---

export interface WorkMaterial {
  id: string;
  work_id?: string; // Link to Work
  work_services_id?: string;
  material_name: string;
  quantity: number;
  unit_cost: number;
  supplier?: string;
  purchase_date?: string;
  invoice_number?: string;
  total_cost: number;
}

export interface WorkLabor {
  id: string;
  work_id?: string; // Link to Work
  work_services_id?: string;
  role: string;
  worker_name?: string;
  cost_type: 'Hora' | 'Diária' | 'Empreitada';
  unit_cost: number;
  quantity: number;
  charges_percent?: number; // Optional in realized
  total_cost: number;
}

export interface WorkIndirect {
  id: string;
  work_id?: string; // Linked to Work directly
  category: string;
  description: string;
  value: number;
  date?: string;
}

export interface WorkService {
  id: string;
  work_id: string;
  plan_service_id?: string; // Links this Realized Service to a Planned Service
  description: string;
  unit: string;
  quantity: number; // Executed quantity
  unit_labor_cost: number;
  unit_material_cost: number;
  unit_indirect_cost: number;
  total_cost: number;
  status: 'Pendente' | 'Em Execução' | 'Concluído';
  materials?: WorkMaterial[];
  labor?: WorkLabor[];
}

export interface WorkHeader {
  id: string;
  plan_id?: string; // Links this Realized Work to a Projected Plan
  name: string;
  client_id: string;
  order_id?: string;

  address: string;
  status: 'Em Andamento' | 'Concluída' | 'Pausada';
  start_date: string;
  end_date?: string;
  total_material_cost?: number;
  total_labor_cost?: number;
  total_indirect_cost?: number;
  total_real_cost?: number;
}

// --- NEW MODULE: SINAPI Integration ---

export interface SinapiInsumo {
  codigo: string;
  descricao: string;
  unidade: string;
  precoMedio: number;
}

export interface SinapiComposicao {
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: string;
  itens: SinapiItemComposicao[];
}

export interface SinapiItemComposicao {
  classe: 'INSUMO' | 'COMPOSICAO';
  codigo: string;
  descricao: string;
  unidade: string;
  coeficiente: number;
  precoUnitario: number;
  total: number;
}

export interface BdiConfig {
  id: string;
  name: string;
  ac: number; // Administração Central (%)
  s: number;  // Seguro (%)
  g: number;  // Garantia (%)
  r: number;  // Risco (%)
  df: number; // Despesas Financeiras (%)
  l: number;  // Lucro (%)
  iss: number; // ISS (%)
  pis: number; // PIS (%)
  cofins: number; // COFINS (%)
  cprb: number; // CPRB (%)
  total: number; // BDI (%)
}
