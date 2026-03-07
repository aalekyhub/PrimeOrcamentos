import { PlanningHeader, PlannedService, PlannedMaterial, PlannedLabor, Customer } from '../types';

export const generatePlanningReport = async (
    currentPlan: PlanningHeader,
    services: PlannedService[],
    totalMaterial: number,
    totalLabor: number,
    totalIndirect: number,
    bdiRate: number,
    taxRate: number,
    company: any,
    customer?: Customer
) => {
    const totalTaxes = (totalMaterial + totalLabor + totalIndirect) * (taxRate / 100);
    const totalGeneral = (totalMaterial + totalLabor + totalIndirect) * (1 + bdiRate / 100) * (1 + taxRate / 100);

    return `
    <div style="width: 100%; background: white; font-family: sans-serif; padding: 15mm;">
        <!-- HEADER SECTION -->
        <div class="report-header" style="padding-bottom: 25px !important; border-bottom: 3px solid #000; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div style="display: flex; align-items: center; justify-content: center;">
                        ${company.logo ? `<img src="${company.logo}" style="height: ${company.logoSize || 70}px; max-width: 250px; object-fit: contain;">` : '<div style="font-weight:900; font-size:28px; color:#2563eb;">PO</div>'}
                    </div>
                    <div>
                    <h1 style="font-size:16px; font-weight:900; color:#0f172a; margin:0 0 1mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${company.name}</h1>
                    <p style="font-size:14px; font-weight:800; color:#0f172a; margin:0 0 1mm 0;">OBRA: ${currentPlan.name}</p>
                    <p style="font-size:10px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">Planejamento Executivo de Obra</p>
                    <p style="font-size:8px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${company.cnpj || ''} | ${company.phone || ''}</p>
                </div>
                </div>
                <div style="text-align:right;">
                    <div style="background:#2563eb; color:white; padding:1.5mm 3mm; border-radius:1.5mm; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.5mm; display:inline-block;">PLANEJAMENTO</div>
                    <p style="font-size:18px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; margin:0 0 0.5mm 0; white-space:nowrap;">${currentPlan.id}</p>
                    <p style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:0;">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
        </div>

        <!-- INFO GRID -->
        <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 6px; border-bottom: 1.5px solid #e2e8f0;">
            <div style="flex: 1; min-width: 150px;">
                <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Cliente</p>
                <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${customer?.name || 'Não Informado'}</p>
            </div>
            <div style="flex: 1; min-width: 150px;">
                <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Tipo de Obra</p>
                <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${currentPlan.type}</p>
            </div>
            <div style="width: 100%;">
                <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Endereço Previsto</p>
                <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${currentPlan.address || 'Não Informado'}</p>
            </div>
        </div>

        <!-- COLORFUL CARDS -->
        <div style="display: flex; gap: 12px; margin-bottom: 25px;">
            ${totalMaterial > 0 ? `
            <div style="flex: 1; background: #ecfdf5; border-bottom: 2px solid #10b981; border-radius: 6px; padding: 12px;">
                <span style="font-size: 8px; font-weight: 700; color: #059669; text-transform: uppercase;">Materiais</span>
                <span style="font-size: 16px; font-weight: 800; color: #064e3b; display: block; white-space: nowrap;">R$ ${totalMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>` : ''}
            ${totalLabor > 0 ? `
            <div style="flex: 1; background: #fffbeb; border-bottom: 2px solid #f59e0b; border-radius: 6px; padding: 12px;">
                <span style="font-size: 8px; font-weight: 700; color: #d97706; text-transform: uppercase;">Mão de Obra</span>
                <span style="font-size: 16px; font-weight: 800; color: #78350f; display: block; white-space: nowrap;">R$ ${totalLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>` : ''}
            ${(totalIndirect + totalTaxes) > 0 ? `
            <div style="flex: 1; background: #eff6ff; border-bottom: 2px solid #3b82f6; border-radius: 6px; padding: 12px;">
                <span style="font-size: 8px; font-weight: 700; color: #2563eb; text-transform: uppercase;">Impostos</span>
                <span style="font-size: 16px; font-weight: 800; color: #1e3a8a; display: block; white-space: nowrap;">R$ ${(totalIndirect + totalTaxes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>` : ''}
        </div>

        <!-- TOTAL BOX -->
        <div style="margin-bottom: 30px; background: #064e3b; color: white; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <p style="font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.1em; color: #a7f3d0;">CUSTO TOTAL PREVISTO</p>
            <p style="font-size: 18px; font-weight: 900; margin: 0; white-space: nowrap;">R$ ${totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <!-- SERVICES -->
        ${services.length > 0 ? `
        <div style="margin-bottom: 30px; page-break-inside: auto;">
            <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">1. Serviços Planejados</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 10px 0; text-align: left; font-size: 10px; color: #64748b;">DESCRIÇÃO</th>
                        <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                        <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 40px;">UND</th>
                        <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 80px;">VL. UNIT.</th>
                        <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VL. TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${services.map((s) => `
                        <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                            <td style="padding: 10px 0; font-size: 11px; font-weight: 600;">${s.description}</td>
                            <td style="padding: 10px 0; font-size: 11px; text-align: center;">${s.quantity}</td>
                            <td style="padding: 10px 0; font-size: 11px; text-align: center;">${s.unit}</td>
                            <td style="padding: 10px 0; font-size: 11px; text-align: right;">R$ ${s.unit_material_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${s.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <div class="report-footer" style="padding-top: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px; text-align: center; page-break-inside: avoid;">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Este documento é um planejamento estimativo da execução da obra.</p>
            <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; font-weight: 800;">${company.name.toUpperCase()} - PLANEJAMENTO DE OBRAS</p>
        </div>
    </div>
  `;
};
