
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
}

export interface DescriptionBlock {
  id: string;
  type: 'text' | 'image';
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
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  description: string;
  relatedOrderId?: string;
}
