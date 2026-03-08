import React from 'react';
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
    Customer,
    CompanyProfile
} from '../../types';
import { ReportTheme } from '../../services/reportPdfService';
import { toNumber, formatMoney, formatQty, formatDateBR } from '../../services/formatUtils';

interface ExecutionReportDocumentProps {
    header: PlanningHeader | WorkHeader;
    customers: Customer[];
    services: (PlannedService | WorkService)[];
    materials: (PlannedMaterial | WorkMaterial)[];
    labor: (PlannedLabor | WorkLabor)[];
    indirects: (PlannedIndirect | WorkIndirect)[];
    taxes: (PlanTax | WorkTax)[];
    calculations: {
        totalMaterial: number;
        totalLabor: number;
        totalIndirect: number;
        totalTax: number;
        totalGeneral: number;
    };
    company: CompanyProfile;
    theme: ReportTheme;
}

export const ExecutionReportDocument = React.forwardRef<HTMLDivElement, ExecutionReportDocumentProps>(
    ({ header, customers, services, materials, labor, indirects, taxes, calculations, company, theme }, ref) => {
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

        const baseTaxValue = Math.max(0, toNumber(calculations.totalGeneral) - toNumber(calculations.totalTax));
        const reportTaxes = taxes.map((t: any) => {
            const rate = toNumber(t.rate);
            const val = toNumber(t.value);
            const calculatedValue = rate > 0 ? baseTaxValue * (rate / 100) : val;
            return { name: t.name || '', rate, calculatedValue };
        });

        let sectionCounter = 1;

        return (
            <div ref={ref} className="pdf-page print-description-content" style={{ fontFamily: 'Inter, Arial, Helvetica, sans-serif', color: '#1e293b' }}>
                <div className="report-header" style={{ paddingBottom: '10px', borderBottom: '2px solid #0f172a', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <div style={{ width: '72%', display: 'flex', alignItems: 'center' }}>
                            {company.logo && (
                                <div style={{ width: '90px', paddingRight: '12px' }}>
                                    <img
                                        src={company.logo}
                                        style={{ maxHeight: `${toNumber(company.logoSize) || 70}px`, maxWidth: '220px', height: 'auto', width: 'auto', objectFit: 'contain', display: 'block' }}
                                        alt="Logo"
                                    />
                                </div>
                            )}
                            <div>
                                <h1 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 3px 0', textTransform: 'uppercase', lineHeight: 1.2 }}>
                                    {company.name || 'Empresa não informada'}
                                </h1>
                                <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 3px 0', lineHeight: 1.3 }}>
                                    OBRA: {(header as any).name || 'Não informado'}
                                </p>
                                <p style={{ fontSize: '10px', fontWeight: 800, color: theme.primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px 0' }}>
                                    {theme.reportTitle}
                                </p>
                                <p style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
                                    {company.cnpj || ''}{company.cnpj && company.phone ? ' | ' : ''}{company.phone || ''}
                                </p>
                            </div>
                        </div>

                        <div style={{ width: '28%', textAlign: 'right' }}>
                            <div style={{ background: theme.primaryColor, color: '#ffffff', padding: '6px 10px', borderRadius: '4px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '8px' }}>
                                {theme.moduleName}
                            </div>
                            <p style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.2 }}>
                                {String((header as any).id || 'SEM CÓDIGO')}
                            </p>
                            <p style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>
                                EMISSÃO: {formatDateBR()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="avoid-break" style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', width: '100%', marginBottom: '10px' }}>
                        <div style={{ width: '33.33%', paddingRight: '12px' }}>
                            <p className="pdf-muted-label">Cliente</p>
                            <p className="pdf-value-text">{customer?.name || 'Não informado'}</p>
                        </div>
                        <div style={{ width: '33.33%', paddingRight: '12px' }}>
                            <p className="pdf-muted-label">Tipo de Obra</p>
                            <p className="pdf-value-text">{(header as any).type || 'Não informado'}</p>
                        </div>
                        <div style={{ width: '33.33%' }}>
                            <p className="pdf-muted-label">Status</p>
                            <p className="pdf-value-text">{(header as any).status || 'Não informado'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="pdf-muted-label">Endereço</p>
                        <p className="pdf-value-text">{(header as any).address || 'Não informado'}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, background: '#ecfdf5', borderBottom: '2px solid #10b981', borderRadius: '6px', padding: '12px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Materiais</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#064e3b', display: 'block', marginTop: '4px' }}>R$ {formatMoney(calculations.totalMaterial)}</span>
                    </div>
                    <div style={{ flex: 1, background: '#fffbeb', borderBottom: '2px solid #f59e0b', borderRadius: '6px', padding: '12px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Mão de Obra</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#78350f', display: 'block', marginTop: '4px' }}>R$ {formatMoney(calculations.totalLabor)}</span>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', borderBottom: '2px solid #64748b', borderRadius: '6px', padding: '12px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Custos Indiretos</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '4px' }}>R$ {formatMoney(calculations.totalIndirect)}</span>
                    </div>
                    <div style={{ flex: 1, background: theme.lightBg, borderBottom: `2px solid ${theme.primaryColor}`, borderRadius: '6px', padding: '12px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: theme.primaryColor, textTransform: 'uppercase' }}>Impostos</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: theme.secondaryColor, display: 'block', marginTop: '4px' }}>R$ {formatMoney(calculations.totalTax)}</span>
                    </div>
                </div>

                <div className="avoid-break" style={{ background: theme.secondaryColor, color: '#ffffff', padding: '10px 14px', borderRadius: '6px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', margin: 0, letterSpacing: '0.08em', color: theme.accentColor, opacity: 0.75 }}>
                        {theme.terminologies.totalLabel}
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>
                        R$ {formatMoney(calculations.totalGeneral)}
                    </p>
                </div>

                {reportServices.length > 0 && (
                    <div className="avoid-break" style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: theme.secondaryColor, textTransform: 'uppercase', margin: '0 0 10px 0', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
                            {sectionCounter++}. {theme.terminologies.servicesSection}
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th className="pdf-th" style={{ textAlign: 'left' }}>DESCRIÇÃO</th>
                                    <th className="pdf-th center" style={{ width: '65px' }}>QTD</th>
                                    <th className="pdf-th center" style={{ width: '50px' }}>UND</th>
                                    <th className="pdf-th right" style={{ width: '90px' }}>{theme.terminologies.totalUnitLabel}</th>
                                    <th className="pdf-th right" style={{ width: '105px' }}>{theme.terminologies.totalRowLabel}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportServices.map((s, idx) => (
                                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <td className="pdf-td" style={{ fontWeight: 600 }}>{s.description}</td>
                                        <td className="pdf-td center">{formatQty(s.quantity)}</td>
                                        <td className="pdf-td center">{s.unit}</td>
                                        <td className="pdf-td right">R$ {formatMoney(s.unitTotal)}</td>
                                        <td className="pdf-td right" style={{ fontWeight: 700 }}>R$ {formatMoney(s.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportMaterials.length > 0 && (
                    <div className="avoid-break" style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: theme.secondaryColor, textTransform: 'uppercase', margin: '0 0 10px 0', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
                            {sectionCounter++}. Insumos e Materiais
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th className="pdf-th" style={{ textAlign: 'left' }}>MATERIAL</th>
                                    <th className="pdf-th center" style={{ width: '65px' }}>QTD</th>
                                    <th className="pdf-th center" style={{ width: '50px' }}>UND</th>
                                    <th className="pdf-th right" style={{ width: '90px' }}>VL. UNIT.</th>
                                    <th className="pdf-th right" style={{ width: '105px' }}>VL. TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportMaterials.map((m, idx) => (
                                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <td className="pdf-td" style={{ fontWeight: 600 }}>{m.name}</td>
                                        <td className="pdf-td center">{formatQty(m.quantity)}</td>
                                        <td className="pdf-td center">{m.unit}</td>
                                        <td className="pdf-td right">R$ {formatMoney(m.unitCost)}</td>
                                        <td className="pdf-td right" style={{ fontWeight: 700 }}>R$ {formatMoney(m.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportLabor.length > 0 && (
                    <div className="avoid-break" style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: theme.secondaryColor, textTransform: 'uppercase', margin: '0 0 10px 0', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
                            {sectionCounter++}. Mão de Obra
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th className="pdf-th" style={{ textAlign: 'left' }}>FUNÇÃO / TIPO</th>
                                    <th className="pdf-th center" style={{ width: '65px' }}>QTD</th>
                                    <th className="pdf-th center" style={{ width: '50px' }}>UND</th>
                                    <th className="pdf-th right" style={{ width: '105px' }}>VL. TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportLabor.map((l, idx) => (
                                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <td className="pdf-td" style={{ fontWeight: 600 }}>
                                            {l.role}{l.type ? ` | (${l.type})` : ''}
                                        </td>
                                        <td className="pdf-td center">{formatQty(l.quantity)}</td>
                                        <td className="pdf-td center">{l.unit}</td>
                                        <td className="pdf-td right" style={{ fontWeight: 700 }}>R$ {formatMoney(l.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportIndirects.length > 0 && (
                    <div className="avoid-break" style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: theme.secondaryColor, textTransform: 'uppercase', margin: '0 0 10px 0', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
                            {sectionCounter++}. Custos Indiretos
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th className="pdf-th" style={{ textAlign: 'left' }}>CATEGORIA / DESCRIÇÃO</th>
                                    <th className="pdf-th right" style={{ width: '105px' }}>VALOR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportIndirects.map((i, idx) => (
                                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <td className="pdf-td" style={{ fontWeight: 600 }}>{i.name}</td>
                                        <td className="pdf-td right" style={{ fontWeight: 700 }}>R$ {formatMoney(i.value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {reportTaxes.length > 0 && (
                    <div className="avoid-break" style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: theme.secondaryColor, textTransform: 'uppercase', margin: '0 0 10px 0', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
                            {sectionCounter++}. Resumo de Impostos
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th className="pdf-th" style={{ textAlign: 'left' }}>IMPOSTO</th>
                                    <th className="pdf-th center" style={{ width: '70px' }}>ALÍQUOTA</th>
                                    <th className="pdf-th right" style={{ width: '120px' }}>VALOR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportTaxes.map((t, idx) => (
                                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <td className="pdf-td" style={{ fontWeight: 600 }}>{t.name}</td>
                                        <td className="pdf-td center">{t.rate > 0 ? `${t.rate.toFixed(2).replace('.', ',')}%` : '-'}</td>
                                        <td className="pdf-td right" style={{ fontWeight: 700 }}>R$ {formatMoney(t.calculatedValue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="avoid-break" style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0', marginTop: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                        Este documento é um levantamento de custos para fins de gestão de obra.
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '10px', color: '#64748b', fontWeight: 800 }}>
                        {String(company.name || '').toUpperCase()} - GESTÃO DE OBRA
                    </p>
                </div>
            </div>
        );
    }
);

ExecutionReportDocument.displayName = 'ExecutionReportDocument';
