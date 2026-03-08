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
    moduleName: string;
    reportTitle: string;
    terminologies: {
        totalLabel: string;
        servicesSection: string;
        totalUnitLabel: string;
        totalRowLabel: string;
    };
}

export const PLANNING_THEME: ReportTheme = {
    primaryColor: '#2563eb',
    secondaryColor: '#1e3a8a',
    accentColor: '#3b82f6',
    lightBg: '#eff6ff',
    darkText: '#0f172a',
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
    primaryColor: '#16a34a',
    secondaryColor: '#064e3b',
    accentColor: '#22c55e',
    lightBg: '#f0fdf4',
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

export const buildPlanningReportHtml = (
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
    const customer = customers.find((c) => c.id === (header as any).client_id);

    const reportServices = services.map((s: any) => {
        const qty = toNumber(s.quantity);
        const mat = toNumber(s.unit_material_cost);
        const lab = toNumber(s.unit_labor_cost);
        const ind = toNumber(s.unit_indirect_cost);
        const unitTotal = mat + lab + ind;
        const total = toNumber(s.total_cost) || (qty * unitTotal);

        return {
            description: s.description || '',
            quantity: qty,
            unit: s.unit || '',
            unitTotal,
            total
        };
    });

    const reportMaterials = materials.map((m: any) => ({
        name: m.material_name || '',
        quantity: toNumber(m.quantity),
        unit: m.unit || '',
        unitCost: toNumber(m.unit_cost),
        total: toNumber(m.total_cost) || (toNumber(m.quantity) * toNumber(m.unit_cost))
    }));

    const reportLabor = labor.map((l: any) => ({
        role: l.role || '',
        type: l.cost_type || '',
        quantity: toNumber(l.quantity),
        unit: l.unit || 'un',
        total: toNumber(l.total_cost) || (toNumber(l.quantity) * toNumber(l.unit_cost))
    }));

    const reportIndirects = indirects.map((i: any) => ({
        name: i.name || '',
        value: toNumber(i.value)
    }));

    const reportTaxes = taxes.map((t: any) => ({
        name: t.name || '',
        rate: toNumber(t.rate),
        calculatedValue: toNumber(t.value)
    }));

    let sectionCounter = 1;

    const logoHtml = company.logo
        ? `<img src="${company.logo}" style="max-height:${toNumber(company.logoSize) || 70}px; max-width:220px; height:auto; width:auto; object-fit:contain; display:block;" />`
        : '';

    return `
        <div style="width:100%; background:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#1e293b; box-sizing:border-box;">
            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 0;
                }

                .pdf-section {
                    margin-bottom: 18px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    page-break-inside: auto;
                }

                .pdf-table thead {
                    display: table-header-group;
                }

                .pdf-table tfoot {
                    display: table-footer-group;
                }

                .pdf-table tr {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                .muted-label {
                    margin: 0 0 4px 0;
                    font-size: 8px;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                .value-text {
                    margin: 0;
                    font-size: 12px;
                    color: #0f172a;
                    font-weight: 700;
                    line-height: 1.35;
                }

                .table-head-cell {
                    padding: 9px 8px;
                    font-size: 10px;
                    color: #64748b;
                    font-weight: 800;
                    border-bottom: 2px solid #e2e8f0;
                }

                .table-body-cell {
                    padding: 9px 8px;
                    font-size: 11px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: top;
                    line-height: 1.35;
                }

                .right {
                    text-align: right;
                }

                .center {
                    text-align: center;
                }
            </style>

            <div class="report-header" style="padding-bottom:10px; border-bottom:2px solid #0f172a; margin-bottom:12px; page-break-inside:avoid;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="width:72%; vertical-align:top; padding:0;">
                            <table style="width:100%; border-collapse:collapse;">
                                <tr>
                                    <td style="width:${company.logo ? '90px' : '0'}; vertical-align:middle; padding:0 12px 0 0;">
                                        ${logoHtml}
                                    </td>
                                    <td style="vertical-align:middle; padding:0;">
                                        <h1 style="font-size:16px; font-weight:900; color:#0f172a; margin:0 0 3px 0; text-transform:uppercase; line-height:1.2;">
                                            ${escapeHtml(company.name || 'Empresa não informada')}
                                        </h1>
                                        <p style="font-size:13px; font-weight:800; color:#0f172a; margin:0 0 3px 0; line-height:1.3;">
                                            OBRA: ${escapeHtml((header as any).name || 'Não informado')}
                                        </p>
                                        <p style="font-size:10px; font-weight:800; color:${theme.primaryColor}; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 3px 0;">
                                            ${escapeHtml(theme.reportTitle)}
                                        </p>
                                        <p style="font-size:8px; color:#64748b; font-weight:700; margin:0; line-height:1.35;">
                                            ${escapeHtml(company.cnpj || '')}${company.cnpj && company.phone ? ' | ' : ''}${escapeHtml(company.phone || '')}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>

                        <td style="width:28%; vertical-align:top; text-align:right; padding:0;">
                            <div style="background:${theme.primaryColor}; color:#ffffff; padding:6px 10px; border-radius:4px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; display:inline-block; margin-bottom:8px;">
                                ${escapeHtml(theme.moduleName)}
                            </div>
                            <p style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 4px 0; line-height:1.2;">
                                ${escapeHtml(String((header as any).id || 'SEM CÓDIGO'))}
                            </p>
                            <p style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; margin:0;">
                                EMISSÃO: ${escapeHtml(formatDateBR())}
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="pdf-section" style="background:#f8fafc; padding:10px 12px; border-radius:6px; border:1px solid #e2e8f0;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="padding:0 12px 10px 0; vertical-align:top; width:33.33%;">
                            <p class="muted-label">Cliente</p>
                            <p class="value-text">${escapeHtml(customer?.name || 'Não informado')}</p>
                        </td>
                        <td style="padding:0 12px 10px 0; vertical-align:top; width:33.33%;">
                            <p class="muted-label">Tipo de Obra</p>
                            <p class="value-text">${escapeHtml((header as any).type || 'Não informado')}</p>
                        </td>
                        <td style="padding:0 0 10px 0; vertical-align:top; width:33.33%;">
                            <p class="muted-label">Status</p>
                            <p class="value-text">${escapeHtml((header as any).status || 'Não informado')}</p>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding:0; vertical-align:top;">
                            <p class="muted-label">Endereço</p>
                            <p class="value-text">${escapeHtml((header as any).address || 'Não informado')}</p>
                        </td>
                    </tr>
                </table>
            </div>

            <table style="width:100%; border-collapse:separate; border-spacing:8px 0; margin:0 0 16px 0;">
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

            <div class="pdf-section" style="background:${theme.secondaryColor}; color:#ffffff; padding:10px 14px; border-radius:6px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="padding:0; vertical-align:middle;">
                            <p style="font-size:9px; font-weight:800; text-transform:uppercase; margin:0; letter-spacing:0.08em; color:${theme.accentColor}; opacity:0.75;">
                                ${escapeHtml(theme.terminologies.totalLabel)}
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

            ${reportServices.length > 0 ? `
                <div class="pdf-section">
                    <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 10px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        ${sectionCounter++}. ${escapeHtml(theme.terminologies.servicesSection)}
                    </h3>

                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th class="table-head-cell" style="text-align:left;">DESCRIÇÃO</th>
                                <th class="table-head-cell center" style="width:65px;">QTD</th>
                                <th class="table-head-cell center" style="width:50px;">UND</th>
                                <th class="table-head-cell right" style="width:90px;">${escapeHtml(theme.terminologies.totalUnitLabel)}</th>
                                <th class="table-head-cell right" style="width:105px;">${escapeHtml(theme.terminologies.totalRowLabel)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportServices.map((s) => `
                                <tr>
                                    <td class="table-body-cell" style="font-weight:600;">${escapeHtml(s.description)}</td>
                                    <td class="table-body-cell center;">${formatQty(s.quantity)}</td>
                                    <td class="table-body-cell center;">${escapeHtml(s.unit)}</td>
                                    <td class="table-body-cell right;">R$ ${formatMoney(s.unitTotal)}</td>
                                    <td class="table-body-cell right" style="font-weight:700;">R$ ${formatMoney(s.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${reportMaterials.length > 0 ? `
                <div class="pdf-section">
                    <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 10px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        ${sectionCounter++}. Insumos e Materiais
                    </h3>

                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th class="table-head-cell" style="text-align:left;">MATERIAL</th>
                                <th class="table-head-cell center" style="width:65px;">QTD</th>
                                <th class="table-head-cell center" style="width:50px;">UND</th>
                                <th class="table-head-cell right" style="width:90px;">VL. UNIT.</th>
                                <th class="table-head-cell right" style="width:105px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportMaterials.map((m) => `
                                <tr>
                                    <td class="table-body-cell" style="font-weight:600;">${escapeHtml(m.name)}</td>
                                    <td class="table-body-cell center;">${formatQty(m.quantity)}</td>
                                    <td class="table-body-cell center;">${escapeHtml(m.unit)}</td>
                                    <td class="table-body-cell right;">R$ ${formatMoney(m.unitCost)}</td>
                                    <td class="table-body-cell right" style="font-weight:700;">R$ ${formatMoney(m.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${reportLabor.length > 0 ? `
                <div class="pdf-section">
                    <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 10px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        ${sectionCounter++}. Mão de Obra
                    </h3>

                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th class="table-head-cell" style="text-align:left;">FUNÇÃO / TIPO</th>
                                <th class="table-head-cell center" style="width:65px;">QTD</th>
                                <th class="table-head-cell center" style="width:50px;">UND</th>
                                <th class="table-head-cell right" style="width:105px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportLabor.map((l) => `
                                <tr>
                                    <td class="table-body-cell" style="font-weight:600;">
                                        ${escapeHtml(l.role)}${l.type ? ` | (${escapeHtml(l.type)})` : ''}
                                    </td>
                                    <td class="table-body-cell center;">${formatQty(l.quantity)}</td>
                                    <td class="table-body-cell center;">${escapeHtml(l.unit)}</td>
                                    <td class="table-body-cell right" style="font-weight:700;">R$ ${formatMoney(l.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${reportIndirects.length > 0 ? `
                <div class="pdf-section">
                    <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 10px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        ${sectionCounter++}. Custos Indiretos
                    </h3>

                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th class="table-head-cell" style="text-align:left;">CATEGORIA / DESCRIÇÃO</th>
                                <th class="table-head-cell right" style="width:105px;">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportIndirects.map((i) => `
                                <tr>
                                    <td class="table-body-cell" style="font-weight:600;">${escapeHtml(i.name)}</td>
                                    <td class="table-body-cell right" style="font-weight:700;">R$ ${formatMoney(i.value)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${reportTaxes.length > 0 ? `
                <div class="pdf-section">
                    <h3 style="font-size:14px; font-weight:800; color:${theme.secondaryColor}; text-transform:uppercase; margin:0 0 10px 0; padding-bottom:6px; border-bottom:2px solid #e2e8f0;">
                        ${sectionCounter++}. Resumo de Impostos
                    </h3>

                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th class="table-head-cell" style="text-align:left;">IMPOSTO</th>
                                <th class="table-head-cell center" style="width:70px;">ALÍQUOTA</th>
                                <th class="table-head-cell right" style="width:120px;">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportTaxes.map((t) => `
                                <tr>
                                    <td class="table-body-cell" style="font-weight:600;">${escapeHtml(t.name)}</td>
                                    <td class="table-body-cell center;">${t.rate > 0 ? `${t.rate.toFixed(2).replace('.', ',')}%` : '-'}</td>
                                    <td class="table-body-cell right" style="font-weight:700;">R$ ${formatMoney(t.calculatedValue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <div class="report-footer" style="padding-top:12px; border-top:1px solid #e2e8f0; margin-top:12px; text-align:center; page-break-inside:avoid;">
                <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
                    Este documento é um levantamento de custos para fins de gestão de obra.
                </p>
                <p style="margin:8px 0 0 0; font-size:10px; color:#64748b; font-weight:800;">
                    ${escapeHtml(String(company.name || '').toUpperCase())} - GESTÃO DE OBRA
                </p>
            </div>
        </div>
    `;
};