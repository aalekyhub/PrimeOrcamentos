// No longer using html2pdf here
import { ServiceOrder, ServiceItem, CompanyProfile, DescriptionBlock } from '../types';
import { escapeHtml, toNumber, roundMoney, formatMoney } from './formatUtils';

// Helper to format dates
const formatDate = (dateStr?: string) => {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR');
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
};

export const buildBudgetHeaderHtml = (budget: ServiceOrder, company: CompanyProfile) => {
  const eDate = formatDate(budget.createdAt);
  const vDays = company.defaultProposalValidity || 15;
  const vDate = budget.dueDate
    ? formatDate(budget.dueDate)
    : formatDate(
      new Date(
        new Date(budget.createdAt || Date.now()).getTime() + vDays * 24 * 60 * 60 * 1000
      ).toISOString()
    );

  return `
    <div class="report-header" style="padding-bottom:18px; border-bottom:2px solid #000; margin-bottom:18px;">
        <table style="width:100%; border-collapse:collapse; table-layout: fixed;">
            <tr>
                <td style="width:72%; vertical-align:top; padding:0;">
                    <table style="width:100%; border-collapse:collapse;">
                        <tr>
                            ${company.logo ? `
                            <td style="width:100px; vertical-align:middle; padding:0 14px 0 0;">
                                <img src="${company.logo}" style="height: ${company.logoSize || 80}px; max-width: 250px; object-fit: contain;">
                            </td>
                            ` : ''}
                            <td style="vertical-align:middle; padding:0;">
                                <h1 style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1.2; margin: 0 0 3px 0; text-transform: uppercase;">
                                    ${escapeHtml(company.name)}
                                </h1>
                                <p style="margin: 0; font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.04em;">
                                    SOLUÇÕES em Gestão Profissional
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b; font-weight: 700;">
                                    ${escapeHtml(company.cnpj || '')}${company.cnpj && company.phone ? ' | ' : ''}${escapeHtml(company.phone || '')}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width:28%; vertical-align:top; text-align:right; padding:0;">
                    <p style="margin: 0; font-size: 24px; font-weight: 900; color: #2563eb; line-height: 1.1;">
                        ${budget.id}
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase;">
                        EMISSÃO: ${eDate}
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase;">
                        VALIDADE: ${vDate}
                    </p>
                </td>
            </tr>
        </table>
    </div>`;
};

export const buildBudgetFooterHtml = (company: CompanyProfile) => {
  const vDays = company.defaultProposalValidity || 15;
  return `
    <div style="margin-top: 24px;">
        <div style="border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 24px; break-inside: avoid; page-break-inside: avoid;">
             <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                 <div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">?</div>
                 <span style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em;">TERMO DE ACEITE E AUTORIZAÇÃO PROFISSIONAL</span>
             </div>
             <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6; text-align: justify; font-weight: 600;">
                 "Este documento constitui uma proposta comercial formal. Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações técnicas descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. A contratada reserva-se o direito de renegociar valores caso a aprovação ocorra após o prazo de validade de ${vDays} dias. Eventuais alterações de escopo solicitadas após o aceite estarão sujeitas a nova análise de custos."
             </p>
        </div>
        <div style="margin-top: 70px;">
            <div style="border-bottom: 2px solid #cbd5e1; width: 400px; max-width: 100%;"></div>
            <p style="margin: 12px 0 0 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.4; padding-bottom: 2px;">ASSINATURA DO CLIENTE / ACEITE</p>
        </div>
    </div>`;
};

export const buildBudgetClientBoxHtml = (budget: ServiceOrder, customerDoc?: string) => {
  return `
    <!-- Boxes Grid -->
    <div style="display: flex; gap: 24px; margin-bottom: 40px;">
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">CLIENTE / DESTINATÁRIO</span>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${escapeHtml(budget.customerName || 'Não Informado')}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px;">${escapeHtml(customerDoc || 'CPF/CNPJ não informado')}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">REFERÊNCIA DO ORÇAMENTO</span>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${escapeHtml(budget.description || 'PROPOSTA COMERCIAL')}</div>
        </div>
    </div>`;
};

export const buildBudgetDescriptionBlocksHtml = (budget: ServiceOrder, company: CompanyProfile) => {
  let html = `
    <!-- Description Blocks -->
    <div style="margin-bottom: 32px;">
          <h2 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.02em;">PROPOSTA COMERCIAL</h2>
          <p style="margin: 0; font-size: 20px; font-weight: 800; color: #2563eb; text-transform: uppercase; line-height: 1.3;">${escapeHtml(budget.description)}</p>
    </div>`;

  if (budget.descriptionBlocks && budget.descriptionBlocks.length > 0) {
    html += `
      <div style="margin-bottom: 48px;" class="print-description-content">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">DESCRIÇÃO DOS SERVIÇOS</div>
        <div style="display: block;">
          ${budget.descriptionBlocks.map((block: DescriptionBlock) => {
      if (block.type === 'text') {
        return `<div class="ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px; color: #334155; line-height: 1.6; text-align: justify; margin-bottom: 24px;">${block.content || ''}</div>`;
      } else if (block.type === 'image') {
        return `<div style="margin: 24px 0; break-inside: avoid; page-break-inside: avoid; display: block; text-align: center;"><img src="${escapeHtml(block.content)}" style="width: auto; max-width: 100%; border-radius: 8px; display: block; margin: 0 auto; object-fit: contain; max-height: 250mm;"></div>`;
      } else if (block.type === 'page-break') {
        return `<div style="page-break-after: always; break-after: page; height: 0;"></div>`;
      }
      return '';
    }).join('')}
        </div>
      </div>`;
  }

  return html;
};

export const buildBudgetItemsTableHtml = (budget: ServiceOrder, company: CompanyProfile) => {
  const itemFBase = company.itemsFontSize || 12;

  const itemsH = budget.items.map((item: ServiceItem) => `
    <tr style="border-bottom: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid;">
      <td style="padding: 8px 0; font-weight: 600; text-transform: uppercase; font-size: ${itemFBase}px; color: #334155; width: 55%; vertical-align: top;">${escapeHtml(item.description)}</td>
      <td style="padding: 8px 0; text-align: center; font-weight: 600; color: #475569; font-size: ${itemFBase}px; width: 10%; vertical-align: top;">${toNumber(item.quantity)} ${escapeHtml(item.unit || '')}</td>
      <td style="padding: 8px 0; text-align: right; color: #475569; font-size: ${itemFBase}px; width: 17.5%; vertical-align: top; white-space: nowrap;">R$ ${formatMoney(item.unitPrice)}</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: ${itemFBase}px; color: #0f172a; width: 17.5%; vertical-align: top; white-space: nowrap;">R$ ${formatMoney(toNumber(item.unitPrice) * toNumber(item.quantity))}</td>
    </tr>
  `).join('');

  return `
      <!-- Items Table -->
      <div style="margin-top: 20px; margin-bottom: 20px; page-break-before: always; break-before: page;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px; margin-bottom: 4px;">DETALHAMENTO FINANCEIRO</div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: left; font-weight: 800; width: 55%; letter-spacing: 0.05em;">ITEM / DESCRIÇÃO</th>
                    <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: center; font-weight: 800; width: 10%; letter-spacing: 0.05em;">QTD</th>
                    <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: right; font-weight: 800; width: 17.5%; letter-spacing: 0.05em;">UNITÁRIO</th>
                    <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: right; font-weight: 800; width: 17.5%; letter-spacing: 0.05em;">SUBTOTAL</th>
                </tr>
            </thead>
            <tbody>${itemsH}</tbody>
        </table>
    </div>`;
};

export const buildBudgetTotalsHtml = (budget: ServiceOrder) => {
  const subT = roundMoney(
    budget.items.reduce((acc, item) => {
      const up = toNumber(item.unitPrice);
      const qty = toNumber(item.quantity);
      return acc + (up * qty);
    }, 0)
  );

  const bdiR = Math.max(0, toNumber(budget.bdiRate));
  const taxR = Math.min(99.99, Math.max(0, toNumber(budget.taxRate)));

  const bdiV = roundMoney(subT * (bdiR / 100));
  const subTWithBDI = roundMoney(subT + bdiV);
  const taxFactorBody = Math.max(0.0001, 1 - (taxR / 100));
  const finalT = roundMoney(subTWithBDI / taxFactorBody);
  const taxV = roundMoney(finalT - subTWithBDI);

  return `
    <!-- Total Bar -->
    <div style="margin-top: 20px; margin-bottom: 30px; break-inside: avoid;">
          <!-- Resumo Superior: Subtotal, BDI e Impostos -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 8px; gap: 40px; padding-right: 12px;">
              <div style="text-align: right;">
                 <span style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; letter-spacing: 0.05em; margin-bottom: 2px; line-height: 1.2;">SUBTOTAL</span>
                 <span style="font-size: 11px; font-weight: 700; color: #334155; display: block; white-space: nowrap;">R$ ${formatMoney(subT)}</span>
              </div>
              <div style="text-align: right;">
                 <span style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">BDI (${bdiR}%)</span>
                 <span style="font-size: 11px; font-weight: 700; color: #10b981; display: block; white-space: nowrap;">+ R$ ${formatMoney(bdiV)}</span>
              </div>
              <div style="text-align: right;">
                 <span style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">IMPOSTOS (${taxR}%)</span>
                 <span style="font-size: 11px; font-weight: 700; color: #3b82f6; display: block; white-space: nowrap;">+ R$ ${formatMoney(taxV)}</span>
              </div>
          </div>

          <!-- Barra de Total Final -->
          <div style="background: #0f172a; border-radius: 12px; padding: 10px 30px; display: flex; justify-content: space-between; align-items: center; color: white;">
              <span style="font-size: 14px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">INVESTIMENTO TOTAL:</span>
              <span style="font-size: 38px; font-weight: 900; letter-spacing: -0.05em; white-space: nowrap;">R$ ${formatMoney(finalT)}</span>
          </div>
    </div>`;
};

export const buildBudgetTermsHtml = (budget: ServiceOrder) => {
  return `
    <!-- Terms & Payment -->
    <div style="margin-bottom: 24px; break-inside: avoid;">
        <div style="display: flex; gap: 24px;">
            <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">FORMA DE PAGAMENTO</span>
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #334155; line-height: 1.5;">${escapeHtml(budget.paymentTerms || 'A combinar')}</p>
            </div>
            <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">PRAZO DE ENTREGA / EXECUÇÃO</span>
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #334155; line-height: 1.5;">${escapeHtml(budget.deliveryTime || 'A combinar')}</p>
            </div>
        </div>
    </div>`;
};

export const getBudgetBodyHtml = (budget: ServiceOrder, company: CompanyProfile, customerDoc?: string) => {
  return `
    ${buildBudgetClientBoxHtml(budget, customerDoc)}
    ${buildBudgetDescriptionBlocksHtml(budget, company)}
    ${buildBudgetItemsTableHtml(budget, company)}
    ${buildBudgetTotalsHtml(budget)}
    ${buildBudgetTermsHtml(budget)}
  `;
};

// removido o table/thead/tfoot que estava reservando espaço fantasma nas páginas seguintes do PDF
export const generateBudgetReportHtml = (
  budget: ServiceOrder,
  company: CompanyProfile,
  customerDoc?: string
) => {
  return `
    <div class="pdf-page-content">
      <div style="width:100%; background:#ffffff; font-family:Inter, Arial, sans-serif; color:#1e293b; padding:0;">
        ${buildBudgetHeaderHtml(budget, company)}
        ${getBudgetBodyHtml(budget, company, customerDoc)}
        ${buildBudgetFooterHtml(company)}
      </div>
    </div>
  `;
};

export const runOptimizePageBreaks = (container: HTMLElement) => {
  const root = container.querySelector('.print-description-content');
  if (!root) return;

  const content = root.querySelector('div:last-child');
  if (!content) return;

  const allNodes: Element[] = [];

  Array.from(content.children).forEach(block => {
    if (block.classList.contains('ql-editor-print')) {
      allNodes.push(...Array.from(block.children));
    } else {
      allNodes.push(block);
    }
  });

  for (let i = 0; i < allNodes.length - 1; i++) {
    const el = allNodes[i] as HTMLElement;
    let isTitle = false;

    if (el.matches('h1, h2, h3, h4, h5, h6')) {
      isTitle = true;
    } else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
      const text = el.innerText.trim();
      const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
      const isBold =
        el.querySelector('strong, b') ||
        (el.style && (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold')) ||
        el.classList.contains('font-bold') ||
        el.tagName === 'STRONG';
      const isShort = text.length < 150;

      if (
        (isNumbered && isBold && isShort) ||
        (isBold && isShort && text === text.toUpperCase() && text.length > 3)
      ) {
        isTitle = true;
      }
    }

    if (isTitle) {
      const nodesToWrap = [el];
      let j = i + 1;

      while (j < allNodes.length && nodesToWrap.length < 2) {
        const next = allNodes[j] as HTMLElement;
        const nextText = next.innerText.trim();
        const nextIsTitle =
          next.matches('h1, h2, h3, h4, h5, h6') ||
          (/^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(nextText) &&
            (next.querySelector('strong, b') ||
              nextText === nextText.toUpperCase() ||
              (next.style && next.style.fontWeight === 'bold')));

        if (nextIsTitle) break;

        nodesToWrap.push(next);
        j++;
      }

      if (nodesToWrap.length > 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'keep-together';
        wrapper.style.breakInside = 'avoid';
        wrapper.style.pageBreakInside = 'avoid';
        wrapper.style.display = 'block';
        wrapper.style.width = '100%';

        el.parentNode?.insertBefore(wrapper, el);
        nodesToWrap.forEach(node => wrapper.appendChild(node));
        i = j - 1;
      }
    }
  }
};

// Legacy methods removed. Integration is now via ReportPreview component.