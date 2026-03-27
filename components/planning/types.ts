export interface Customer {
    id: string;
    name: string;
    document?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface PlanningHeader {
    id: string;
    name: string;
    client_id: string;
    client_name?: string;
    address: string;
    type: string;
    status: 'Planejamento' | 'Em Andamento' | 'Concluído' | 'Cancelado';
    created_at: string;
    total_real_cost?: number;
    annex_image?: string;
}

export interface PlannedService {
    id: string;
    plan_id: string;
    description: string;
    unit: string;
    quantity: number;
    unit_material_cost: number;
    unit_labor_cost: number;
    unit_indirect_cost: number;
    total_cost: number;
}

export interface PlannedMaterial {
    id: string;
    plan_id: string;
    material_name: string;
    unit: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
}

export interface PlannedLabor {
    id: string;
    plan_id: string;
    role: string;
    cost_type: 'Diária' | 'Hora' | 'Empreitada';
    unit: string;
    quantity: number;
    unit_cost: number;
    charges_percent: number;
    total_cost: number;
}

export interface PlannedIndirect {
    id: string;
    plan_id: string;
    category: string;
    description: string;
    value: number;
}

export interface PlanTax {
    id: string;
    plan_id: string;
    name: string;
    rate: number;
    value: number;
}

export type ResourceTab = 'material' | 'mo' | 'indireto' | 'impostos';
export type MainTab = 'dados' | 'servicos' | 'recursos' | 'resumo';
