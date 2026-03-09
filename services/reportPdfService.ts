import {
    PlanningHeader,
    PlannedService,
    PlannedMaterial,
    PlannedLabor,
    PlannedIndirect,
    PlanTax,
    WorkHeader,
    WorkService,
    WorkMaterial,
    WorkLabor,
    WorkIndirect,
    WorkTax,
    Customer
} from '../types';

export interface ReportTheme {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    lightBg: string;
    darkText: string;
    moduleName: string; // e.g., "PLANEJAMENTO" or "EXECUÇÃO"
    reportTitle: string; // e.g., "Planejamento Executivo" or "Relatório de Execução"
    terminologies: {
        totalLabel: string; // "Custo Total Previsto" or "Custo Total Realizado"
        servicesSection: string; // "Serviços Planejados" or "Serviços Executados"
        totalUnitLabel: string; // "VL. UNIT." or "VL. UNIT."
        totalRowLabel: string; // "VL. TOTAL" or "VL. REALIZADO"
    }
}

export const PLANNING_THEME: ReportTheme = {
    primaryColor: '#2563eb', // Blue 600
    secondaryColor: '#1e3a8a', // Blue 900
    accentColor: '#3b82f6', // Blue 500
    lightBg: '#eff6ff', // Blue 50
    darkText: '#0f172a', // Slate 900
    moduleName: 'PLANEJAMENTO',
    reportTitle: 'Planejamento Executivo de Obra',
    terminologies: {
        totalLabel: 'Custo Total Previsto',
        servicesSection: 'Serviços Planejados',
        totalUnitLabel: 'VL. UNIT.',
        totalRowLabel: 'VL. TOTAL'
    }
};

export const EXECUTION_THEME: ReportTheme = {
    primaryColor: '#16a34a', // Green 600
    secondaryColor: '#064e3b', // Green 900
    accentColor: '#22c55e', // Green 500
    lightBg: '#f0fdf4', // Green 50
    darkText: '#064e3b',
    moduleName: 'EXECUÇÃO',
    reportTitle: 'Relatório de Execução de Obra',
    terminologies: {
        totalLabel: 'Custo Total Realizado',
        servicesSection: 'Serviços Executados',
        totalUnitLabel: 'VL. UNIT.',
        totalRowLabel: 'VL. REALIZADO'
    }
};

import { escapeHtml, toNumber, formatMoney, formatQty, formatDateBR } from './formatUtils';

export const buildExecutionReportHtml = (
    header: PlanningHeader | WorkHeader,
    customers: Customer[],
    services: (PlannedService | WorkService)[],
    materials: (PlannedMaterial | WorkMaterial)[],
    labor: (PlannedLabor | WorkLabor)[],
    indirects: (PlannedIndirect | WorkIndirect)[],
    taxes: (PlanTax | WorkTax)[],
    calculations: {
        totalMaterial: number;
        totalLabor: number;
        totalIndirect: number;
        totalTax: number;
        totalGeneral: number;
    },
    company: {
        name: string;
        cnpj?: string;
        phone?: string;
        logo?: string;
        logoSize?: number;
    },
    theme: ReportTheme
): string => {
    const customer = customers.find((c) => c.id === header.client_id);

    // Pre-processing
    const reportServices = services.map((s: any) => {
        const qty = toNumber(s.quantity);
        const mat = toNumber(s.unit_material_cost);
        const lab = toNumber(s.unit_labor_cost);
        const ind = toNumber(s.unit_indirect_cost);
        const unitTotal = mat + lab + ind;
        const total = toNumber(s.total_cost) || (qty * unitTotal);

        return {
            description: s.description,
            quantity: qty,
            unit: s.unit,
            unitTotal,
            total
        };
    });

    const reportMaterials = materials.map((m: any) => ({
        name: m.material_name,
        quantity: toNumber(m.quantity),
        unit: m.unit,
        unitCost: toNumber(m.unit_cost),
        total: toNumber(m.total_cost) || (toNumber(m.quantity) * toNumber(m.unit_cost))
    }));

    const reportLabor = labor.map((l: any) => {
        const qty = toNumber(l.quantity);
        const unitCost = toNumber(l.unit_cost);
        const total = toNumber(l.total_cost) || (qty * unitCost);
        return {
            role: l.role,
            type: l.cost_type,
            quantity: qty,
            unit: l.unit || 'un',
            unitCost,
            total
        };
    });

    const reportIndirects = indirects.map((i: any) => ({
        name: i.name,
        value: toNumber(i.value)
    }));

    const baseTaxValue = Math.max(0, toNumber(calculations.totalGeneral) - toNumber(calculations.totalTax));
    const reportTaxes = taxes.map((t: any) => {
        const rate = toNumber(t.rate);
        const val = toNumber(t.value);
        const calculatedValue = rate > 0 ? baseTaxValue * (rate / 100) : val;
        return { name: t.name, rate, calculatedValue };
    });

    let sectionCounter = 1;

    return `
        <div class="pdf-page-content">
            <div style="width:100%; background:#ffffff; font-family:Inter, Arial, sans-serif; color:#1e293b; padding:0;">
                <div class="report-header" style="padding-bottom:18px; border-bottom:2px solid #0f172a; margin-bottom:18px;">
                    <table style="width:100%; border-collapse:collapse; table-layout: fixed;">
                        <tr>
                            <td style="width:72%; vertical-align:top; padding:0;">
                                <table style="width:100%; border-collapse:collapse;">
                                    <tr>
                                        ${company.logo ? `
                                        <td style="width:90px; vertical-align:middle; padding:0 14px 0 0;">
                                            <img src="${company.logo}" style="max-height:${toNumber(company.logoSize) || 70}px; max-width:220px; object-fit:contain; display:block;">
                                        </td>
                                        ` : ''}
                                        <td style="vertical-align:middle; padding:0;">
                                            <h1 style="font-size:16px; font-weight:900; color:#0f172a; margin:0 0 3px 0; text-transform:uppercase; line-height: 1.2;">
                                                ${escapeHtml(company.name || 'Empresa não informada')}
                                            </h1>
                                            <p style="font-size:13px; font-weight:800; color:#0f172a; margin:0 0 3px 0; line-height: 1.2;">
                                                NOME IDENTIFICADOR DA OBRA: ${escapeHtml(header.name || 'Não informado')}
                                            </p>
                                            <p style="font-size:10px; font-weight:800; color:${theme.primaryColor}; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 3px 0;">
                                                ${theme.reportTitle}
                                            </p>
                                            <p style="font-size:8px; color:#64748b; font-weight:700; margin:0; line-height: 1.2;">
                                                ${escapeHtml(company.cnpj || '')}${company.cnpj && company.phone ? ' | ' : ''}${escapeHtml(company.phone || '')}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td style="width:28%; vertical-align:top; text-align:right; padding:0;">
                                <div style="background:${theme.primaryColor}; color:#ffffff; padding:6px 10px; border-radius:4px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; display:inline-block; margin-bottom:8px;">
                                    ${theme.moduleName}
                                </div>
                                <p style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 4px 0; line-height: 1.1;">
                                    ${escapeHtml(header.id)}
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
                                <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml((header as any).type || 'Não informado')}</p>
                            </td>
                            <td style="padding:0 0 10px 0; vertical-align:top; width:33.33%;">
                                <p style="margin:0 0 4px 0; font-size:8px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em;">Status</p>
                                <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml(header.status || 'Não informado')}</p>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="3" style="padding:0; vertical-align:top;">
                                <p style="margin:0 0 4px 0; font-size:8px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em;">Endereço</p>
                                <p style="margin:0; font-size:12px; color:#0f172a; font-weight:700;">${escapeHtml((header as any).address || 'Não informado')}</p>
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
                        <td style="width:25%; background:${theme.lightBg}; border-bottom:2px solid ${theme.primaryColor}; border-radius:6px; padding:12px;">
                            <span style="font-size:8px; font-weight:700; color:${theme.primaryColor}; text-transform:uppercase;">Impostos</span>
                            <span style="font-size:16px; font-weight:800; color:${theme.secondaryColor}; display:block; margin-top:4px;">R$ ${formatMoney(calculations.totalTax)}</span>
                        </td>
                    </tr>
                </table>

                <div style="margin-bottom:24px; background:${theme.secondaryColor}; color:#ffffff; padding:12px 16px; border-radius:6px;">
                    <table style="width:100%; border-collapse:collapse;">
                        <tr>
                            <td style="padding:0; vertical-align:middle;">
                                <p style="font-size:9px; font-weight:800; text-transform:uppercase; margin:0; letter-spacing:0.08em; color:#ffffff;">
                                    ${theme.terminologies.totalLabel}
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
                        <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                            ${sectionCounter++}. ${theme.terminologies.servicesSection}
                        </h3>
                        <table style="width:100%; border-collapse:collapse;">
                            <tbody>
                                <tr style="border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">DESCRIÇÃO</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:65px;">QTD</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:50px;">UND</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:90px;">${theme.terminologies.totalUnitLabel}</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">${theme.terminologies.totalRowLabel}</th>
                                </tr>
                                ${reportServices
                .map((s) => `
                                    <tr style="border-bottom:1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                                        <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml(s.description)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${formatQty(s.quantity)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml(s.unit)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right;">R$ ${formatMoney(s.unitTotal)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(s.total)}</td>
                                    </tr>`)
                .join('')}
                            </tbody>
                        </table>
                    </div>`
            : ''
        }

                ${reportMaterials.length > 0
            ? `
                    <div style="margin-bottom:26px;">
                        <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                            ${sectionCounter++}. Insumos e Materiais
                        </h3>
                        <table style="width:100%; border-collapse:collapse;">
                            <tbody>
                                <tr style="border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">MATERIAL</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:65px;">QTD</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:50px;">UND</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:90px;">VL. UNIT.</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VL. TOTAL</th>
                                </tr>
                                ${reportMaterials
                .map((m) => `
                                    <tr style="border-bottom:1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                                        <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml(m.name)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${formatQty(m.quantity)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml(m.unit)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right;">R$ ${formatMoney(m.unitCost)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(m.total)}</td>
                                    </tr>`)
                .join('')}
                            </tbody>
                        </table>
                    </div>`
            : ''
        }

                ${reportLabor.length > 0
            ? `
                    <div style="margin-bottom:26px;">
                        <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                            ${sectionCounter++}. Mão de Obra
                        </h3>
                        <table style="width:100%; border-collapse:collapse;">
                            <tbody>
                                <tr style="border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">FUNÇÃO / TIPO</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:65px;">QTD</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:50px;">UND</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:90px;">VL. UNIT.</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VL. TOTAL</th>
                                </tr>
                                ${reportLabor
                .map((l) => `
                                    <tr style="border-bottom:1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                                        <td style="padding:10px 8px; font-size:11px; font-weight:600;">
                                            ${escapeHtml(l.role)}${l.type ? ` | (${escapeHtml(l.type)})` : ''}
                                        </td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${formatQty(l.quantity)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${escapeHtml(l.unit)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right;">R$ ${formatMoney(l.unitCost)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(l.total)}</td>
                                    </tr>`)
                .join('')}
                            </tbody>
                        </table>
                    </div>`
            : ''
        }

                ${reportIndirects.length > 0
            ? `
                    <div style="margin-bottom:26px;">
                        <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                            ${sectionCounter++}. Custos Indiretos
                        </h3>
                        <table style="width:100%; border-collapse:collapse;">
                            <tbody>
                                <tr style="border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">CATEGORIA / DESCRIÇÃO</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:105px;">VALOR</th>
                                </tr>
                                ${reportIndirects
                .map((i) => `
                                    <tr style="border-bottom:1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                                        <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml(i.name)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(i.value)}</td>
                                    </tr>`)
                .join('')}
                            </tbody>
                        </table>
                    </div>`
            : ''
        }

                ${reportTaxes.length > 0
            ? `
                    <div style="margin-bottom:26px;">
                        <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 12px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                            ${sectionCounter++}. Resumo de Impostos
                        </h3>
                        <table style="width:100%; border-collapse:collapse;">
                            <tbody>
                                <tr style="border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px 8px; text-align:left; font-size:10px; color:#64748b;">IMPOSTO</th>
                                    <th style="padding:10px 8px; text-align:center; font-size:10px; color:#64748b; width:70px;">ALÍQUOTA</th>
                                    <th style="padding:10px 8px; text-align:right; font-size:10px; color:#64748b; width:120px;">VALOR</th>
                                </tr>
                                ${reportTaxes
                .map((t) => `
                                    <tr style="border-bottom:1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                                        <td style="padding:10px 8px; font-size:11px; font-weight:600;">${escapeHtml(t.name)}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:center;">${t.rate > 0 ? `${t.rate.toFixed(2)}%` : '-'}</td>
                                        <td style="padding:10px 8px; font-size:11px; text-align:right; font-weight:700;">R$ ${formatMoney(t.calculatedValue)}</td>
                                    </tr>`)
                .join('')}
                            </tbody>
                        </table>
                    </div>`
            : ''
        }

                <div class="report-footer" style="padding-top:18px; border-top:1px solid #e2e8f0; margin-top:18px; text-align:center;">
                    <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
                        Este documento é um levantamento de custos para fins de gestão de obra.
                    </p>
                    <p style="margin:10px 0 0 0; font-size:10px; color:#64748b; font-weight:800;">
                        ${escapeHtml(String(company.name || '').toUpperCase())} - GESTÃO DE OBRA
                    </p>
                </div>
            </div>
        </div>
    `;
};
