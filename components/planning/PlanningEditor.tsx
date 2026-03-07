import React, { useMemo, useState } from 'react';
import {
    Building2,
    Truck,
    HardHat,
    FileText,
    Save,
    ArrowRight,
    PieChart,
} from 'lucide-react';
import { useNotify } from '../ToastProvider';
import { db } from '../../services/db';
import { DataTab } from './tabs/DataTab';
import { ServicesTab } from './tabs/ServicesTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { SummaryTab } from './tabs/SummaryTab';
import {
    PlanningHeader,
    PlannedService,
    PlannedMaterial,
    PlannedLabor,
    PlannedIndirect,
    PlanTax,
    Customer,
    MainTab,
} from './types';

interface PlanningCalculations {
    totalMaterial: number;
    totalLabor: number;
    totalIndirect: number;
    totalTax: number;
    totalGeneral: number;
}

interface CompanyProfileLite {
    name: string;
    cnpj?: string;
    phone?: string;
    logo?: string;
    logoSize?: number;
}

interface NewServiceInput {
    description: string;
    quantity: number | string;
    unit: string;
    unit_material_cost: number | string;
    unit_labor_cost: number | string;
    unit_indirect_cost?: number | string;
    [key: string]: any;
}

interface NewMaterialInput {
    material_name: string;
    quantity: number | string;
    unit: string;
    unit_cost: number | string;
    [key: string]: any;
}

interface NewLaborInput {
    role: string;
    quantity: number | string;
    unit?: string;
    unit_cost: number | string;
    cost_type?: string;
    [key: string]: any;
}

interface NewIndirectInput {
    category: string;
    description?: string;
    value: number | string;
    [key: string]: any;
}

interface NewTaxInput {
    name: string;
    rate?: number | string;
    value?: number | string;
    [key: string]: any;
}

interface PlanningEditorProps {
    currentPlan: PlanningHeader | null;
    services: PlannedService[];
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    customers: Customer[];
    calculations: PlanningCalculations;
    onUpdatePlan: (plan: PlanningHeader) => void;
    onUpdateServices: (services: PlannedService[]) => void;
    onUpdateMaterials: (materials: PlannedMaterial[]) => void;
    onUpdateLabor: (labor: PlannedLabor[]) => void;
    onUpdateIndirects: (indirects: PlannedIndirect[]) => void;
    onUpdateTaxes: (taxes: PlanTax[]) => void;
    onDeleteService: (id: string) => void;
    onDeleteMaterial: (id: string) => void;
    onDeleteLabor: (id: string) => void;
    onDeleteIndirect: (id: string) => void;
    onDeleteTax: (id: string) => void;
    onSave: () => void;
    onGenerateBudget: () => void;
    onBack: () => void;
    embeddedMode: boolean;
    onShowPreview: (title: string, html: string, filename: string) => void;
}

const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const normalized = value
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatMoney = (value: unknown): string => {
    return toNumber(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const escapeHtml = (value: unknown): string => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const formatDateBR = (value?: string | Date): string => {
    try {
        if (!value) return new Date().toLocaleDateString('pt-BR');
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('pt-BR');
        return date.toLocaleDateString('pt-BR');
    } catch {
        return new Date().toLocaleDateString('pt-BR');
    }
};

const buildSafeFileName = (value?: string): string => {
    const name = String(value || 'planejamento-obra')
        .replace(/\.pdf$/i, '')
        .replace(/[\\/:*?"<>|]+/g, '')
        .trim();

    return `${name || 'planejamento-obra'}.pdf`;
};

const getPlanCode = (id?: string): string => {
    const raw = String(id || '').trim();
    if (!raw) return 'PLAN-0000';

    const lastPart = raw.includes('-') ? raw.split('-').pop() : raw;
    return `PLAN-${String(lastPart || '0000').toUpperCase()}`;
};

const calculateServiceTotal = (service: {
    quantity: unknown;
    unit_material_cost: unknown;
    unit_labor_cost: unknown;
    unit_indirect_cost?: unknown;
}): number => {
    const quantity = toNumber(service.quantity);
    const material = toNumber(service.unit_material_cost);
    const labor = toNumber(service.unit_labor_cost);
    const indirect = toNumber(service.unit_indirect_cost);

    return quantity * (material + labor + indirect);
};

const calculateMaterialTotal = (material: {
    quantity: unknown;
    unit_cost: unknown;
}): number => {
    return toNumber(material.quantity) * toNumber(material.unit_cost);
};

const calculateLaborTotal = (item: {
    quantity: unknown;
    unit_cost: unknown;
}): number => {
    return toNumber(item.quantity) * toNumber(item.unit_cost);
};

const buildPlanningReportHtml = ({
    currentPlan,
    services,
    materials,
    labor,
    indirects,
    taxes,
    customers,
    calculations,
    company,
}: {
    currentPlan: PlanningHeader;
    services: PlannedService[];
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    customers: Customer[];
    calculations: PlanningCalculations;
    company: CompanyProfileLite;
}): string => {
    const customer = customers.find((c) => c.id === currentPlan.client_id);

    const reportServices = services.map((s) => {
        const quantity = toNumber(s.quantity);
        const unitMaterial = toNumber(s.unit_material_cost);
        const unitLabor = toNumber(s.unit_labor_cost);
        const unitIndirect = toNumber((s as any).unit_indirect_cost);
        const unitTotal = unitMaterial + unitLabor + unitIndirect;
        const total = toNumber(s.total_cost) || calculateServiceTotal({
            quantity,
            unit_material_cost: unitMaterial,
            unit_labor_cost: unitLabor,
            unit_indirect_cost: unitIndirect,
        });

        return {
            ...s,
            quantity,
            unitTotal,
            total,
        };
    });

    const reportMaterials = materials.map((m) => ({
        ...m,
        quantity: toNumber(m.quantity),
        unitCost: toNumber(m.unit_cost),
        total: toNumber(m.total_cost) || calculateMaterialTotal(m),
    }));

    const reportLabor = labor.map((l) => ({
        ...l,
        quantity: toNumber(l.quantity),
        total: toNumber(l.total_cost) || calculateLaborTotal(l),
    }));

    const reportIndirects = indirects.map((i) => ({
        ...i,
        valueSafe: toNumber(i.value),
    }));

    const baseTaxValue = Math.max(0, toNumber(calculations.totalGeneral) - toNumber(calculations.totalTax));

    const reportTaxes = taxes.map((t) => {
        const rate = toNumber(t.rate);
        const fixedValue = toNumber(t.value);
        const calculatedValue = rate > 0 ? baseTaxValue * (rate / 100) : fixedValue;

        return {
            ...t,
            rate,
            calculatedValue,
        };
    });

    return `
        <div style="width:100%; background:#ffffff; font-family:Inter, Arial, sans-serif; color:#1e293b; padding:8mm;">
            <div class="report-header" style="padding-bottom:18px; border-bottom:2px solid #0f172a; margin-bottom:18px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="width:72%; vertical-align:top; padding:0;">
                            <table style="width:100%; border-collapse:collapse;">
                                <tr>
                                    <td style="width:${company.logo ? '90px' : '0'}; vertical-align:middle; padding:0 14px 0 0;">
                                        ${company.logo
            ? `<img src="${company.logo}" style="max-height:${toNumber(company.logoSize) || 70}px; max-width:220px; object-fit:contain; display:block;">`
            : ''
        }
                                    </td>
                                    <td style="vertical-align:middle; padding:0;">
                                        <h1 style="font-size:16px; font-weight:900; color:#0f172a; margin:0 0 3px 0; text-transform:uppercase;">
                                            ${escapeHtml(company.name || 'PRIME SERVIÇOS E MANUTENÇÃO LTDA')}
                                        </h1>
                                        <p style="font-size:13px; font-weight:800; color:#0f172a; margin:0 0 3px 0;">
                                            OBRA: ${escapeHtml(currentPlan.name || 'Não informado')}
                                        </p>
                                        <p style="font-size:10px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 3px 0;">
                                            Planejamento Executivo de Obra
                                        </p>
                                        <p style="font-size:8px; color:#64748b; font-weight:700; margin:0;">
                                            ${escapeHtml(company.cnpj || '')}${company.cnpj && company.phone ? ' | ' : ''}${escapeHtml(company.phone || '')}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td style="width:28%; vertical-align:top; text-align:right; padding:0;">
                            <div style="background:#2563eb; color:#ffffff; padding:6px 10px; border-radius:4px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; display:inline-block; margin-bottom:8px;">
                                PLANEJAMENTO
                            </div>
                            <p style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 4px 0;">
                                ${escapeHtml(getPlanCode(currentPlan.id))}
                            </p>
                            <p style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; margin:0;">
                                EMISSÃO: ${escapeHtml(formatDateBR())}
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div style="background:#f8fafc; padding:14px; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:18px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="padding:0 12px 10px 0; vertical-align:top; width:33.33%;">
                            <p style="margin:0 0 4px 0; font-size:8px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em;">Cliente</p>
                            <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml(customer?.name || 'Não informado')}</p>
                        </td>
                        <td style="padding:0 12px 10px 0; vertical-align:top; width:33.33%;">
                            <p style="margin:0 0 4px 0; font-size:8px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em;">Tipo de Obra</p>
                            <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml((currentPlan as any).type || 'Não informado')}</p>
                        </td>
                        <td style="padding:0 0 10px 0; vertical-align:top; width:33.33%;">
                            <p style="margin:0 0 4px 0; font-size:8px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em;">Status</p>
                            <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml(currentPlan.status || 'Não informado')}</p>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding:0; vertical-align:top;">
                            <p style="margin:0 0 4px 0; font-size:8px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em;">Endereço Previsto</p>
                            <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml((currentPlan as any).address || 'Não informado')}</p>
                        </td>
                    </tr>
                </table>
            </div>

            <table style="width:100%; border-collapse:separate; border-spacing:10px 0; margin:0 -10px 20px -10px;">
                <tr>
                    <td style="width:25%; background:#ecfdf5; border-bottom:2px solid #10b981; border-radius:6px; padding:12px;">
                        <span style="font-size:8px; font-weight:700; color:#059669; text-transform:uppercase;">Materiais</span>
                        <span style="font-size:16px; font-weight:800; color:#064e3b; display:block; margin-top:4px;">R$ ${formatMoney(calculations.totalMaterial)}</span>
                    </td>
                    <td style="width:25%; background:#fffbeb; border-bottom:2px solid #f59e0b; border-radius:6px; padding:12px;">
                        <span style="font-size:8px; font-weight:700; color:#d97706; text-transform:uppercase;">Mão de Obra</span>
                        <span style="font-size:16px; font-weight:800; color:#78350f; display:block; margin-top:4px;">R$ ${formatMoney(calculations.totalLabor)}</span>
                    </td>
                    <td style="width:25%; background:#f8fafc; border-bottom:2px solid #64748b; border-radius:6px; padding:12px;">
                        <span style="font-size:8px; font-weight:700; color:#475569; text-transform:uppercase;">Custos Indiretos</span>
                        <span style="font-size:16px; font-weight:800; color:#0f172a; display:block; margin-top:4px;">R$ ${formatMoney(calculations.totalIndirect)}</span>
                    </td>
                    <td style="width:25%; background:#eff6ff; border-bottom:2px solid #3b82f6; border-radius:6px; padding:12px;">
                        <span style="font-size:8px; font-weight:700; color:#2563eb; text-transform:uppercase;">Impostos</span>
                        <span style="font-size:16px; font-weight:800; color:#1e3a8a; display:block; margin-top:4px;">R$ ${formatMoney(calculations.totalTax)}</span>
                    </td>
                </tr>
            </table>

            <div style="margin-bottom:24px; background:#064e3b; color:#ffffff; padding:12px 16px; border-radius:6px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="padding:0; vertical-align:middle;">
                            <p style="font-size:9px; font-weight:800; text-transform:uppercase; margin:0; letter-spacing:0.08em; color:#a7f3d0;">
                                Custo Total Previsto
                            </p>
                        </td>
                        <td style="padding:0; vertical-align:middle; text-align:right;">
                            <p style="font-size:18px; font-weight:900; margin:0;">
                                R$ ${formatMoney(calculations.totalGeneral)}
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            ${reportServices.length > 0
            ? `
                <div style="margin-bottom:26px;">
                    <h3 style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        1. Serviços Planejados
                    </h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0;">
                                <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">DESCRIÇÃO</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:65px;">QTD</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:50px;">UND</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:90px;">VL. UNIT.</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportServices
                .map(
                    (s) => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml((s as any).description)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml(s.quantity)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml((s as any).unit)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right;">R$ ${formatMoney(s.unitTotal)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(s.total)}</td>
                                </tr>
                            `
                )
                .join('')}
                        </tbody>
                    </table>
                </div>`
            : ''
        }

            ${reportMaterials.length > 0
            ? `
                <div style="margin-bottom:26px;">
                    <h3 style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        2. Insumos e Materiais
                    </h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0;">
                                <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">MATERIAL</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:65px;">QTD</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:50px;">UND</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:90px;">VL. UNIT.</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportMaterials
                .map(
                    (m) => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml((m as any).material_name)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml(m.quantity)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml((m as any).unit)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right;">R$ ${formatMoney(m.unitCost)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(m.total)}</td>
                                </tr>
                            `
                )
                .join('')}
                        </tbody>
                    </table>
                </div>`
            : ''
        }

            ${reportLabor.length > 0
            ? `
                <div style="margin-bottom:26px;">
                    <h3 style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        3. Mão de Obra
                    </h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0;">
                                <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">FUNÇÃO / TIPO</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:65px;">QTD</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:50px;">UND</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportLabor
                .map(
                    (l) => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 8px; font-size:11px; font-weight:600;">
                                        ${escapeHtml((l as any).role)}${(l as any).cost_type ? ` | (${escapeHtml((l as any).cost_type)})` : ''}
                                    </td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml(l.quantity)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml((l as any).unit || 'un')}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(l.total)}</td>
                                </tr>
                            `
                )
                .join('')}
                        </tbody>
                    </table>
                </div>`
            : ''
        }

            ${reportIndirects.length > 0
            ? `
                <div style="margin-bottom:26px;">
                    <h3 style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        4. Custos Indiretos
                    </h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0;">
                                <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">CATEGORIA / DESCRIÇÃO</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportIndirects
                .map(
                    (i) => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 8px; font-size:11px; font-weight:600;">
                                        ${escapeHtml((i as any).category)}${(i as any).description ? ` - ${escapeHtml((i as any).description)}` : ''}
                                    </td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(i.valueSafe)}</td>
                                </tr>
                            `
                )
                .join('')}
                        </tbody>
                    </table>
                </div>`
            : ''
        }

            ${reportTaxes.length > 0
            ? `
                <div style="margin-bottom:26px;">
                    <h3 style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        5. Resumo de Impostos
                    </h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0;">
                                <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">IMPOSTO</th>
                                <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:70px;">ALÍQUOTA</th>
                                <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:120px;">VALOR PREVISTO</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportTaxes
                .map(
                    (t) => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml((t as any).name)}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:center;">${t.rate > 0 ? `${t.rate.toFixed(2)}%` : '-'}</td>
                                    <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(t.calculatedValue)}</td>
                                </tr>
                            `
                )
                .join('')}
                        </tbody>
                    </table>
                </div>`
            : ''
        }

            <div class="report-footer" style="padding-top:18px; border-top:1px solid #e2e8f0; margin-top:18px; text-align:center;">
                <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
                    Este documento é um levantamento preliminar de custos para fins de orçamento.
                </p>
                <p style="margin:10px 0 0 0; font-size:10px; color:#64748b; font-weight:800;">
                    ${escapeHtml(String(company.name || '').toUpperCase())} - GESTÃO DE PLANEJAMENTO
                </p>
            </div>
        </div>
    `;
};

export const PlanningEditor: React.FC<PlanningEditorProps> = ({
    currentPlan,
    services,
    materials,
    labor,
    indirects,
    taxes,
    customers,
    calculations,
    onUpdatePlan,
    onUpdateServices,
    onUpdateMaterials,
    onUpdateLabor,
    onUpdateIndirects,
    onUpdateTaxes,
    onDeleteService,
    onDeleteMaterial,
    onDeleteLabor,
    onDeleteIndirect,
    onDeleteTax,
    onSave,
    onGenerateBudget,
    onBack,
    embeddedMode,
    onShowPreview,
}) => {
    const [activeTab, setActiveTab] = useState<MainTab>('dados');
    const { notify } = useNotify();

    const company = useMemo<CompanyProfileLite>(() => {
        const loaded = db.load('serviflow_company', {
            name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: '12.345.678/0001-90',
            logoSize: 70,
        });

        return {
            name: loaded?.name || 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: loaded?.cnpj || '',
            phone: loaded?.phone || '',
            logo: loaded?.logo || '',
            logoSize: toNumber(loaded?.logoSize) || 70,
        };
    }, []);

    if (!currentPlan) return null;

    const handleAddService = (serviceData: NewServiceInput) => {
        const quantity = toNumber(serviceData.quantity);
        const unitMaterial = toNumber(serviceData.unit_material_cost);
        const unitLabor = toNumber(serviceData.unit_labor_cost);
        const unitIndirect = toNumber(serviceData.unit_indirect_cost);

        const newService: PlannedService = {
            id: db.generateId('SVC'),
            plan_id: currentPlan.id,
            ...serviceData,
            quantity,
            unit_material_cost: unitMaterial,
            unit_labor_cost: unitLabor,
            unit_indirect_cost: unitIndirect,
            total_cost: quantity * (unitMaterial + unitLabor + unitIndirect),
        } as PlannedService;

        onUpdateServices([...services, newService]);
    };

    const handleAddMaterial = (materialData: NewMaterialInput) => {
        const quantity = toNumber(materialData.quantity);
        const unitCost = toNumber(materialData.unit_cost);

        const newMaterial: PlannedMaterial = {
            id: db.generateId('MAT'),
            plan_id: currentPlan.id,
            ...materialData,
            quantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
        } as PlannedMaterial;

        onUpdateMaterials([...materials, newMaterial]);
    };

    const handleAddLabor = (laborData: NewLaborInput) => {
        const quantity = toNumber(laborData.quantity);
        const unitCost = toNumber(laborData.unit_cost);

        const newLabor: PlannedLabor = {
            id: db.generateId('LBR'),
            plan_id: currentPlan.id,
            ...laborData,
            quantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
        } as PlannedLabor;

        onUpdateLabor([...labor, newLabor]);
    };

    const handleAddIndirect = (indirectData: NewIndirectInput) => {
        const newIndirect: PlannedIndirect = {
            id: db.generateId('IND'),
            plan_id: currentPlan.id,
            ...indirectData,
            value: toNumber(indirectData.value),
        } as PlannedIndirect;

        onUpdateIndirects([...indirects, newIndirect]);
    };

    const handleAddTax = (taxData: NewTaxInput) => {
        const newTax: PlanTax = {
            id: db.generateId('TAX'),
            plan_id: currentPlan.id,
            ...taxData,
            rate: toNumber(taxData.rate),
            value: toNumber(taxData.value),
        } as PlanTax;

        onUpdateTaxes([...taxes, newTax]);
    };

    const handlePreviewReport = () => {
        const html = buildPlanningReportHtml({
            currentPlan,
            services,
            materials,
            labor,
            indirects,
            taxes,
            customers,
            calculations: {
                totalMaterial: toNumber(calculations.totalMaterial),
                totalLabor: toNumber(calculations.totalLabor),
                totalIndirect: toNumber(calculations.totalIndirect),
                totalTax: toNumber(calculations.totalTax),
                totalGeneral: toNumber(calculations.totalGeneral),
            },
            company,
        });

        onShowPreview(
            'Planejamento de Obra',
            html,
            buildSafeFileName(currentPlan.name || 'planejamento-obra')
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[80vh] flex flex-col border dark:border-slate-800 overflow-hidden">
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-4">
                        {!embeddedMode && (
                            <button
                                onClick={onBack}
                                className="text-blue-400 hover:text-blue-600 p-1"
                                type="button"
                            >
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        )}

                        <div>
                            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                <HardHat className="text-blue-600 dark:text-blue-400" />
                                {String(currentPlan.name || '').toUpperCase()}
                            </h2>
                            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">
                                {currentPlan.status} • GESTÃO DE PLANEJAMENTO
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                notify('Sincronização com a nuvem disponível conforme configuração do sistema.', 'info');
                            }}
                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-200 transition-all border border-blue-200 dark:border-blue-800"
                        >
                            <ArrowRight className="rotate-180" size={16} />
                            Sincronizar
                        </button>

                        <button
                            type="button"
                            onClick={onSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-900/20"
                        >
                            <Save size={16} />
                            Salvar
                        </button>
                    </div>
                </div>

                <div className="flex px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'dados', label: 'Dados da Obra', icon: FileText },
                        { id: 'servicos', label: 'Serviços', icon: Building2 },
                        { id: 'recursos', label: 'Gastos Detalhados', icon: Truck },
                        { id: 'resumo', label: 'Resumo de Custo', icon: PieChart },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as MainTab)}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-auto">
                {activeTab === 'dados' && (
                    <DataTab
                        plan={currentPlan}
                        customers={customers}
                        onUpdatePlan={onUpdatePlan}
                    />
                )}

                {activeTab === 'servicos' && (
                    <ServicesTab
                        services={services}
                        onAddService={handleAddService}
                        onUpdateService={(updatedService: PlannedService) =>
                            onUpdateServices(
                                services.map((service) =>
                                    service.id === updatedService.id
                                        ? {
                                            ...updatedService,
                                            total_cost: calculateServiceTotal(updatedService),
                                        }
                                        : service
                                )
                            )
                        }
                        onDeleteService={onDeleteService}
                        onReorderServices={onUpdateServices}
                        planId={currentPlan.id}
                    />
                )}

                {activeTab === 'recursos' && (
                    <ResourcesTab
                        planId={currentPlan.id}
                        materials={materials}
                        labor={labor}
                        indirects={indirects}
                        taxes={taxes}
                        calculations={calculations}
                        onAddMaterial={handleAddMaterial}
                        onAddLabor={handleAddLabor}
                        onAddIndirect={handleAddIndirect}
                        onAddTax={handleAddTax}
                        onUpdateMaterials={onUpdateMaterials}
                        onUpdateLabor={onUpdateLabor}
                        onUpdateIndirects={onUpdateIndirects}
                        onUpdateTaxes={onUpdateTaxes}
                        onDeleteMaterial={onDeleteMaterial}
                        onDeleteLabor={onDeleteLabor}
                        onDeleteIndirect={onDeleteIndirect}
                        onDeleteTax={onDeleteTax}
                    />
                )}

                {activeTab === 'resumo' && (
                    <SummaryTab
                        calculations={calculations}
                        onGenerateBudget={onGenerateBudget}
                        onPreviewReport={handlePreviewReport}
                        hasGenerateBudget={!!onGenerateBudget}
                    />
                )}
            </div>
        </div>
    );
};