import { ServiceOrder, CompanyProfile, DescriptionBlock, ServiceItem } from '../types';
import { financeUtils } from './financeUtils';
import { escapeHtml, formatDateBR as formatDate } from './formatUtils';

// Modular Header for OS
export const buildOsHeaderHtml = (order: ServiceOrder, company: CompanyProfile, title: string) => {
    return `
    <div class="report-header" style="padding: 10mm 0 8mm 0; border-bottom: 3px solid #0f172a; margin-bottom: 8mm;">
        <table style="width:100%; border-collapse:collapse; table-layout: fixed;">
            <tr>
                <td style="width:72%; vertical-align:top; padding:0;">
                    <table style="width:100%; border-collapse:collapse;">
                        <tr>
                            <td style="width:90px; vertical-align:middle; padding:0 14px 0 0;">
                                ${company.logo ? `<img src="${company.logo}" style="max-height: 80px; max-width: 250px; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                            </td>
                            <td style="vertical-align:middle; padding:0;">
                                <h1 style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 2mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${escapeHtml(company.name)}</h1>
                                <p style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">${title}</p>
                                <p style="font-size:9px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${escapeHtml(company.cnpj || '')} | ${escapeHtml(company.phone || '')}</p>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width:28%; vertical-align:top; text-align:right; padding:0;">
                    <div style="background:#2563eb; color:white; padding:2mm 4mm; border-radius:2mm; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:3mm; display:inline-block;">ORDEM DE SERVIÇO</div>
                    <p style="font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-1px; margin:0 0 1mm 0; white-space:nowrap; line-height: 1;">${order.id}</p>
                    <p style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:6px 0 0 0;">ABERTURA: ${formatDate(order.createdAt || '')}</p>
                </td>
            </tr>
        </table>
    </div>`;
};

// Modular Boxes for Customer and Details
export const buildOsClientBoxHtml = (order: ServiceOrder, customer: any) => {
    return `
    <div style="display: flex; gap: 24px; margin-bottom: 32px;">
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">CLIENTE / SOLICITANTE</span>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${escapeHtml(customer.name)}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px;">${escapeHtml(customer.document || 'Documento não inf.')}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">REFERÊNCIA / LOCAL</span>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${escapeHtml(order.description || 'OBRA / REFORMA')}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px;">PREVISÃO: ${order.deliveryTime || (order.dueDate ? formatDate(order.dueDate) : 'A combinar')}</div>
        </div>
    </div>`;
};

// Modular Box for Equipment (for OS EQUIP)
export const buildOsEquipmentBoxHtml = (order: ServiceOrder) => {
    return `
    <div style="display: flex; gap: 24px; margin-bottom: 32px;">
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">DADOS DO EQUIPAMENTO</span>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${escapeHtml(order.equipmentBrand || '')} ${escapeHtml(order.equipmentModel || 'Não especificado')}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px;">SÉRIE: ${escapeHtml(order.equipmentSerialNumber || 'N/A')}</div>
        </div>
    </div>`;
};

// Modular Section for Technical Description
export const buildOsDescriptionBlocksHtml = (order: ServiceOrder, company: CompanyProfile, title: string = "DESCRIÇÃO TÉCNICA") => {
    if (!order.descriptionBlocks || order.descriptionBlocks.length === 0) return '';

    return `
    <div class="mb-10 print-description-content">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">${title}</div>
        <div class="space-y-6">
            ${order.descriptionBlocks.map((block: DescriptionBlock) => {
        if (block.type === 'text') {
            return `<div class="ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px; color: #334155; line-height: 1.6; text-align: justify; margin-bottom: 20px;">${block.content || ''}</div>`;
        } else if (block.type === 'image') {
            return `<div style="margin: 24px 0; break-inside: avoid; page-break-inside: avoid; display: block; text-align: center;"><img src="${escapeHtml(block.content)}" style="width: auto; max-width: 100%; border-radius: 12px; display: block; margin: 0 auto; object-fit: contain; max-height: 230mm;"></div>`;
        } else if (block.type === 'page-break') {
            return `<div style="page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0;"></div>`;
        }
        return '';
    }).join('')}
        </div>
    </div>`;
};

// Modular Section for Items Table
export const buildOsItemsTableHtml = (order: ServiceOrder, company: CompanyProfile) => {
    const itemFBase = company.itemsFontSize || 10;
    const itemsHtml = order.items.map((item: ServiceItem) => `
        <tr style="border-bottom: 1px solid #f1f5f9; break-inside: avoid; page-break-inside: avoid;">
            <td style="padding: 10px 0; font-weight: 600; text-transform: uppercase; font-size: ${itemFBase}px; color: #0f172a; width: 55%; vertical-align: top;">${escapeHtml(item.description)}</td>
            <td style="padding: 10px 0; text-align: center; color: #64748b; font-size: ${itemFBase}px; font-weight: 600; width: 10%; vertical-align: top;">${item.quantity} ${escapeHtml(item.unit || 'UN')}</td>
            <td style="padding: 10px 0; text-align: right; color: #64748b; font-size: ${itemFBase}px; width: 17.5%; vertical-align: top; white-space: nowrap;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: ${itemFBase + 1}px; color: #0f172a; width: 17.5%; vertical-align: top; white-space: nowrap;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`).join('');

    return `
    <div class="mb-8 overflow-hidden">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px;">MATERIAIS E SERVIÇOS</div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <thead>
                <tr style="border-bottom: 2px solid #0f172a;">
                    <th style="padding-bottom: 8px; text-align: left; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; width: 55%;">Descrição</th>
                    <th style="padding-bottom: 8px; text-align: center; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; width: 10%;">Qtd</th>
                    <th style="padding-bottom: 8px; text-align: right; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; width: 17.5%;">Unitário</th>
                    <th style="padding-bottom: 8px; text-align: right; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; width: 17.5%;">Total</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
    </div>`;
};

// Modular Totals Section
export const buildOsTotalsHtml = (order: ServiceOrder) => {
    const { subtotal, bdiValue, taxValue, finalTotal } = financeUtils.getDetailedFinancials(order);

    return `
    <div class="avoid-break mb-8">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px; gap: 40px; padding: 0 12px;">
            <div style="text-align: right;">
                <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px;">Subtotal</p>
                <p style="font-size: 10px; font-weight: 800; color: #0f172a; margin: 0;">R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            ${order.bdiRate ? `
            <div style="text-align: right;">
                <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px;">BDI (${order.bdiRate}%)</p>
                <p style="font-size: 10px; font-weight: 800; color: #059669; margin: 0;">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>` : ''}
            ${order.taxRate ? `
            <div style="text-align: right;">
                <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px;">Impostos (${order.taxRate}%)</p>
                <p style="font-size: 10px; font-weight: 800; color: #2563eb; margin: 0;">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>` : ''}
        </div>
        <div style="background: #0f172a; border-radius: 12px; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; color: white;">
            <span style="font-size: 14px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">INVESTIMENTO TOTAL:</span>
            <span style="font-size: 32px; font-weight: 900; letter-spacing: -0.05em; white-space: nowrap;">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
    </div>`;
};

// Modular Terms Section
export const buildOsTermsHtml = (order: ServiceOrder, company: CompanyProfile) => {
    return `
    <div class="avoid-break mb-12" style="display: flex; gap: 16px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <p style="color: #2563eb; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Forma de Pagamento</p>
            <p style="color: #1e293b; font-size: ${Math.max(13, (company.descriptionFontSize || 12))}px; font-weight: 700; margin: 0;">${escapeHtml(order.paymentTerms || 'A combinar com o responsável.')}</p>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <p style="color: #2563eb; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Prazo de Entrega / Execução</p>
            <p style="color: #1e293b; font-size: ${Math.max(13, (company.descriptionFontSize || 12))}px; font-weight: 700; margin: 0;">${escapeHtml(order.deliveryTime || 'Conforme cronograma da obra.')}</p>
        </div>
    </div>`;
};

// Modular Signature Section
export const buildOsSignaturesHtml = (order: ServiceOrder, company: CompanyProfile) => {
    return `
    <div style="margin-top: 60px;" class="avoid-break pt-12">
        <div style="display: flex; justify-content: space-between; gap: 64px; padding: 0 40px;">
            <div style="flex: 1; text-align: center;">
                <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Responsável Técnico</p>
                <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${escapeHtml(company.name)}</p>
            </div>
            <div style="flex: 1; text-align: center; position: relative;">
                ${order.signature ? `<img src="${order.signature}" style="max-height: 50px; position: absolute; top: -45px; left: 50%; transform: translateX(-50%);">` : ''}
                <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Assinatura do Cliente / Aceite</p>
                <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${escapeHtml(order.customerName)}</p>
            </div>
        </div>
    </div>`;
};

// MAIN FUNCTIONS
export const buildOsHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
    return `
    <div class="pdf-page-content">
        <div class="a4-container">
            ${buildOsHeaderHtml(order, company, "Ordem de Serviço de Obra / Reforma")}
            ${buildOsClientBoxHtml(order, customer)}
            ${buildOsDescriptionBlocksHtml(order, company)}
            ${buildOsItemsTableHtml(order, company)}
            ${buildOsTotalsHtml(order)}
            ${buildOsTermsHtml(order, company)}
            ${buildOsSignaturesHtml(order, company)}
        </div>
    </div>`;
};

export const buildMaintenanceOsHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
    return `
    <div class="pdf-page-content">
        <div class="a4-container">
            ${buildOsHeaderHtml(order, company, "Ordem de Serviço de Equipamento")}
            ${buildOsClientBoxHtml(order, customer)}
            ${buildOsEquipmentBoxHtml(order)}
            
            <div class="mb-10">
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px;">Diagnóstico / Laudo Técnico</div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                    <p style="font-size: 14px; color: #334155; line-height: 1.6; font-weight: 500; margin:0; white-space: pre-wrap;">${escapeHtml(order.serviceDescription || 'Nenhum laudo técnico registrado.')}</p>
                </div>
            </div>

            ${buildOsDescriptionBlocksHtml(order, company, "DETALHAMENTO E ESCOPO ADICIONAL")}
            ${buildOsItemsTableHtml(order, company)}
            ${buildOsTotalsHtml(order)}
            ${buildOsTermsHtml(order, company)}
            ${buildOsSignaturesHtml(order, company)}
        </div>
    </div>`;
};
