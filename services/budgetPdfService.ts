import html2pdf from 'html2pdf.js';
import { ServiceOrder, ServiceItem, CompanyProfile, DescriptionBlock } from '../types';

const DEFAULT_FONT_FAMILY = `'Inter', sans-serif`;

const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown): string => {
  return toNumber(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateValue?: string | number | Date) => {
  const fallback = new Date().toLocaleDateString('pt-BR');
  if (!dateValue) return fallback;

  try {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('pt-BR');
  } catch {
    return fallback;
  }
};

const normalizeItems = (items?: ServiceItem[]): ServiceItem[] => {
  return Array.isArray(items) ? items : [];
};

const calculateBudgetTotals = (budget: ServiceOrder) => {
  const items = normalizeItems(budget.items);
  const subtotal = items.reduce((acc, item) => acc + toNumber(item.unitPrice) * toNumber(item.quantity), 0);

  const bdiRate = Math.max(0, toNumber(budget.bdiRate));
  const taxRateRaw = Math.max(0, toNumber(budget.taxRate));
  const taxRate = Math.min(taxRateRaw, 99.99);

  const bdiValue = subtotal * (bdiRate / 100);
  const subtotalWithBDI = subtotal + bdiValue;
  const taxFactor = 1 - taxRate / 100;
  const finalTotal = taxFactor > 0 ? subtotalWithBDI / taxFactor : subtotalWithBDI;
  const taxValue = finalTotal - subtotalWithBDI;

  return {
    items,
    subtotal,
    bdiRate,
    taxRate,
    bdiValue,
    subtotalWithBDI,
    taxValue,
    finalTotal,
  };
};

const sanitizeRichHtml = (html: unknown): string => {
  const source = String(html ?? '').trim();
  if (!source) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return source;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'text/html');

  const blockedTags = ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'style'];
  blockedTags.forEach(tag => {
    doc.querySelectorAll(tag).forEach(node => node.remove());
  });

  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'style') {
        return;
      }

      if ((name === 'href' || name === 'src') && /^javascript:/i.test(value.trim())) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
};

const waitForImages = async (root: ParentNode) => {
  const images = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];

  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );
};

const waitForFonts = async (docRef: Document) => {
  if ('fonts' in docRef) {
    try {
      // @ts-ignore
      await docRef.fonts.ready;
    } catch {
      // noop
    }
  }
};

const buildPrintStyles = () => `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: white; color: #000; font-family: ${DEFAULT_FONT_FAMILY}; }
  body { font-family: ${DEFAULT_FONT_FAMILY}; }
  @page { size: A4; margin: 0 !important; }

  .pdf-page,
  .a4-container {
    width: 210mm;
    max-width: 210mm;
    background: white;
  }

  .a4-container {
    width: 100%;
    padding: 0 15mm !important;
    margin: 0;
  }

  .avoid-break,
  .keep-together {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  .print-header-space,
  .print-footer-space {
    height: 15mm;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: auto !important; page-break-inside: auto !important; }

  .pdf-header { margin-bottom: 25px; }
  .pdf-footer { margin-top: 32px; }

  .print-description-content .print-description-inner {
    display: block;
    width: 100%;
  }

  .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
  .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
  .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
  .ql-editor-print strong, .ql-editor-print b { font-weight: 700 !important; color: #000 !important; }
  .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4, .ql-editor-print h5, .ql-editor-print h6 {
    font-weight: 800 !important;
    color: #0f172a !important;
    margin-top: 20px !important;
    margin-bottom: 10px !important;
    break-after: avoid !important;
    page-break-after: avoid !important;
  }

  @media print {
    @page { size: A4; margin: 0 !important; }
    html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
    .a4-container { box-shadow: none !important; border: none !important; margin: 0 !important; }
  }
`;

const optimizePageBreaksOnRoot = (root: ParentNode) => {
  const descriptionRoot = root.querySelector('.print-description-content');
  if (!descriptionRoot) return;

  const content = descriptionRoot.querySelector('.print-description-inner');
  if (!content) return;

  const allNodes: Element[] = [];

  Array.from(content.children).forEach((block) => {
    if (block.classList.contains('ql-editor-print')) {
      allNodes.push(...Array.from(block.children));
    } else {
      allNodes.push(block);
    }
  });

  for (let i = 0; i < allNodes.length - 1; i++) {
    const el = allNodes[i] as HTMLElement;
    if (!el || !el.parentNode) continue;

    let isTitle = false;

    if (el.matches('h1, h2, h3, h4, h5, h6')) {
      isTitle = true;
    } else if (['P', 'DIV', 'STRONG'].includes(el.tagName)) {
      const text = (el.innerText || '').trim();
      const isNumbered = /^\d+(\.\d+)*[\.\s\)]/.test(text);
      const fontWeight = el.style?.fontWeight || '';
      const parsedWeight = parseInt(fontWeight, 10);
      const isBold = Boolean(
        el.querySelector('strong, b') ||
        (!Number.isNaN(parsedWeight) && parsedWeight >= 600) ||
        fontWeight === 'bold' ||
        el.classList.contains('font-bold') ||
        el.tagName === 'STRONG'
      );
      const isShort = text.length > 0 && text.length < 150;

      if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 3)) {
        isTitle = true;
      }
    }

    if (!isTitle) continue;

    const nodesToWrap: HTMLElement[] = [el];
    let j = i + 1;

    while (j < allNodes.length && nodesToWrap.length < 2) {
      const next = allNodes[j] as HTMLElement;
      const nextText = (next.innerText || '').trim();
      const nextWeight = next.style?.fontWeight || '';
      const parsedNextWeight = parseInt(nextWeight, 10);
      const nextIsTitle = next.matches('h1, h2, h3, h4, h5, h6') ||
        (/^\d+(\.\d+)*[\.\s\)]/.test(nextText) &&
          (next.querySelector('strong, b') || nextText === nextText.toUpperCase() || (!Number.isNaN(parsedNextWeight) && parsedNextWeight >= 600) || nextWeight === 'bold'));

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
      el.parentNode.insertBefore(wrapper, el);
      nodesToWrap.forEach((node) => wrapper.appendChild(node));
      i = j - 1;
    }
  }
};

export const buildBudgetHeaderHtml = (budget: ServiceOrder, company: CompanyProfile) => {
  const issueDate = formatDate(budget.createdAt);
  const validityDays = toNumber(company.defaultProposalValidity) || 15;
  const dueBase = budget.createdAt || Date.now();
  const dueDate = budget.dueDate
    ? formatDate(budget.dueDate)
    : formatDate(new Date(new Date(dueBase).getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString());

  const companyName = escapeHtml(company.name || 'Empresa');
  const companyCnpj = escapeHtml(company.cnpj || '');
  const companyPhone = escapeHtml(company.phone || '');
  const budgetId = escapeHtml(budget.id || 'ORC');
  const logoHtml = company.logo
    ? `<img src="${String(company.logo)}" style="height: ${toNumber(company.logoSize) || 80}px; max-width: 250px; object-fit: contain;">`
    : '<div style="font-weight:900; font-size:32px; color:#1e3a8a;">PRIME</div>';

  return `
    <div style="padding-bottom: 25px; border-bottom: 3px solid #000; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px;">
        <div style="display: flex; gap: 24px; align-items: center; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: flex-start;">
            ${logoHtml}
          </div>
          <div style="min-width: 0;">
            <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.2; margin: 0 0 2px 0; text-transform: uppercase;">${companyName}</h1>
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.02em;">SOLUÇÕES EM GESTÃO PROFISSIONAL</p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b; font-weight: 500;">${companyCnpj}${companyCnpj && companyPhone ? ' | ' : ''}${companyPhone}</p>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <p style="margin: 0; font-size: 24px; font-weight: 800; color: #2563eb;">${budgetId}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">EMISSÃO: ${escapeHtml(issueDate)}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">VALIDADE: ${escapeHtml(dueDate)}</p>
        </div>
      </div>
    </div>`;
};

export const buildBudgetFooterHtml = (company: CompanyProfile) => {
  const validityDays = toNumber(company.defaultProposalValidity) || 15;

  return `
    <div style="margin-top: 32px; break-inside: avoid;">
      <div style="border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">?</div>
          <span style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em;">TERMO DE ACEITE E AUTORIZAÇÃO PROFISSIONAL</span>
        </div>
        <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6; text-align: justify; font-weight: 600;">
          Este documento constitui uma proposta comercial formal. Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações técnicas descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. A contratada reserva-se o direito de renegociar valores caso a aprovação ocorra após o prazo de validade de ${validityDays} dias. Eventuais alterações de escopo solicitadas após o aceite estarão sujeitas a nova análise de custos.
        </p>
      </div>
      <div style="margin-top: 100px; break-inside: avoid;">
        <div style="border-bottom: 2px solid #cbd5e1; width: 400px; max-width: 100%;"></div>
        <p style="margin: 12px 0 0 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.4; padding-bottom: 2px;">ASSINATURA DO CLIENTE / ACEITE</p>
      </div>
    </div>`;
};

export const buildBudgetClientBoxHtml = (budget: ServiceOrder, customerDoc?: string) => {
  return `
    <div style="display: flex; gap: 24px; margin-bottom: 40px;">
      <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
        <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">CLIENTE / DESTINATÁRIO</span>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${escapeHtml(budget.customerName || 'Não informado')}</div>
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
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.02em;">PROPOSTA COMERCIAL</h2>
      <p style="margin: 0; font-size: 20px; font-weight: 800; color: #2563eb; text-transform: uppercase; line-height: 1.3;">${escapeHtml(budget.description || 'PROPOSTA COMERCIAL')}</p>
    </div>`;

  if (Array.isArray(budget.descriptionBlocks) && budget.descriptionBlocks.length > 0) {
    html += `
      <div style="margin-bottom: 48px;" class="print-description-content">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">DESCRIÇÃO DOS SERVIÇOS</div>
        <div class="print-description-inner">
          ${budget.descriptionBlocks.map((block: DescriptionBlock) => {
      if (block.type === 'text') {
        return `<div class="ql-editor-print" style="font-size: ${toNumber(company.descriptionFontSize) || 14}px; color: #334155; line-height: 1.6; text-align: justify; margin-bottom: 24px;">${sanitizeRichHtml(block.content)}</div>`;
      }

      if (block.type === 'image') {
        return `<div style="margin: 24px 0; break-inside: avoid; page-break-inside: avoid; display: block; text-align: center;"><img src="${String(block.content || '')}" style="width: auto; max-width: 100%; border-radius: 8px; display: block; margin: 0 auto; object-fit: contain; max-height: 250mm;"></div>`;
      }

      if (block.type === 'page-break') {
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
  const items = normalizeItems(budget.items);
  const itemFontSize = toNumber(company.itemsFontSize) || 12;

  const itemsHtml = items.map((item: ServiceItem) => {
    const qty = toNumber(item.quantity);
    const unitPrice = toNumber(item.unitPrice);
    const lineTotal = qty * unitPrice;

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: 600; text-transform: uppercase; font-size: ${itemFontSize}px; color: #334155; width: 55%; vertical-align: top; word-break: break-word;">${escapeHtml(item.description)}</td>
        <td style="padding: 8px 0; text-align: center; font-weight: 600; color: #475569; font-size: ${itemFontSize}px; width: 10%; vertical-align: top;">${escapeHtml(String(qty))} ${escapeHtml(item.unit || '')}</td>
        <td style="padding: 8px 0; text-align: right; color: #475569; font-size: ${itemFontSize}px; width: 17.5%; vertical-align: top; white-space: nowrap;">R$ ${formatCurrency(unitPrice)}</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: ${itemFontSize}px; color: #0f172a; width: 17.5%; vertical-align: top; white-space: nowrap;">R$ ${formatCurrency(lineTotal)}</td>
      </tr>`;
  }).join('');

  return `
    <div style="page-break-before: always; break-before: page; margin-top: 20px; margin-bottom: 20px;">
      <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px; margin-bottom: 4px;">DETALHAMENTO FINANCEIRO</div>
      <table>
        <thead>
          <tr style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: left; font-weight: 800; width: 55%; letter-spacing: 0.05em;">ITEM / DESCRIÇÃO</th>
            <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: center; font-weight: 800; width: 10%; letter-spacing: 0.05em;">QTD</th>
            <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: right; font-weight: 800; width: 17.5%; letter-spacing: 0.05em;">UNITÁRIO</th>
            <th style="padding: 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: right; font-weight: 800; width: 17.5%; letter-spacing: 0.05em;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>`;
};

export const buildBudgetTotalsHtml = (budget: ServiceOrder) => {
  const { subtotal, bdiRate, taxRate, bdiValue, taxValue, finalTotal } = calculateBudgetTotals(budget);

  return `
    <div style="margin-top: 20px; margin-bottom: 30px; break-inside: avoid;">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px; gap: 40px; padding-right: 12px; flex-wrap: wrap;">
        <div style="text-align: right;">
          <span style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; letter-spacing: 0.05em; margin-bottom: 2px; line-height: 1.2;">SUBTOTAL</span>
          <span style="font-size: 11px; font-weight: 700; color: #334155; display: block; white-space: nowrap;">R$ ${formatCurrency(subtotal)}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">BDI (${formatCurrency(bdiRate)}%)</span>
          <span style="font-size: 11px; font-weight: 700; color: #10b981; display: block; white-space: nowrap;">+ R$ ${formatCurrency(bdiValue)}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">IMPOSTOS (${formatCurrency(taxRate)}%)</span>
          <span style="font-size: 11px; font-weight: 700; color: #3b82f6; display: block; white-space: nowrap;">+ R$ ${formatCurrency(taxValue)}</span>
        </div>
      </div>

      <div style="background: #0f172a; border-radius: 12px; padding: 10px 30px; display: flex; justify-content: space-between; align-items: center; color: white; gap: 20px;">
        <span style="font-size: 14px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">INVESTIMENTO TOTAL:</span>
        <span style="font-size: 38px; font-weight: 900; letter-spacing: -0.05em; white-space: nowrap;">R$ ${formatCurrency(finalTotal)}</span>
      </div>
    </div>`;
};

export const buildBudgetTermsHtml = (budget: ServiceOrder) => {
  return `
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

export const generateBudgetReportHtml = (budget: ServiceOrder, company: CompanyProfile, customerDoc?: string) => {
  return `
    <table style="width: 100%; border-collapse: collapse; font-family: ${DEFAULT_FONT_FAMILY};">
      <thead>
        <tr>
          <td style="height: 15mm; border: none; padding: 0;"><div class="print-header-space">&nbsp;</div></td>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td style="height: 15mm; border: none; padding: 0;"><div class="print-footer-space">&nbsp;</div></td>
        </tr>
      </tfoot>
      <tbody>
        <tr>
          <td style="padding: 0;">
            <div class="a4-container">
              <div class="pdf-header">
                ${buildBudgetHeaderHtml(budget, company)}
              </div>
              ${getBudgetBodyHtml(budget, company, customerDoc)}
              <div class="pdf-footer">
                ${buildBudgetFooterHtml(company)}
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;
};

export const runOptimizePageBreaks = (container: HTMLElement) => {
  optimizePageBreaksOnRoot(container);
};

export const printBudget = async (budget: ServiceOrder, company: CompanyProfile, customerDoc?: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = generateBudgetReportHtml(budget, company, customerDoc);
  const styleBlock = buildPrintStyles();

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Orçamento - ${escapeHtml(budget.id)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>${styleBlock}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const tryPrint = async () => {
    try {
      await waitForFonts(printWindow.document);
      await waitForImages(printWindow.document);

      const root = printWindow.document.body;
      if (root) {
        optimizePageBreaksOnRoot(root);
      }

      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error('Erro ao preparar impressão:', error);
      printWindow.focus();
      printWindow.print();
    }
  };

  if (printWindow.document.readyState === 'complete') {
    void tryPrint();
  } else {
    printWindow.onload = () => { void tryPrint(); };
  }
};

export const downloadBudgetPdf = async (
  budget: ServiceOrder,
  company: CompanyProfile,
  customerDoc?: string,
  notify?: (msg: string, type?: string) => void
) => {
  let container: HTMLDivElement | null = null;

  try {
    notify?.('Gerando PDF...');

    container = document.createElement('div');
    container.id = 'pdf-temp-root';

    Object.assign(container.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: '210mm',
      background: 'white',
      pointerEvents: 'none',
      zIndex: '999999',
    });

    container.innerHTML = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
      <style>${buildPrintStyles()}</style>
      <div class="pdf-page">
        ${generateBudgetReportHtml(budget, company, customerDoc)}
      </div>
    `;

    document.body.appendChild(container);

    runOptimizePageBreaks(container);
    await waitForImages(container);
    await waitForFonts(document);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const elementToPrint = container.querySelector('.pdf-page') as HTMLElement | null;
    if (!elementToPrint) {
      throw new Error('Elemento de impressão não encontrado.');
    }

    const safeDescription = (budget.description || 'Proposta').replace(/[\\/:"*?<>|]/g, '_').trim() || 'Proposta';
    const filename = `${budget.id || 'ORC'} - ${safeDescription}.pdf`;

    const options = {
      margin: [10, 0, 15, 0] as [number, number, number, number],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        letterRendering: true,
        windowWidth: 1200,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] as any },
    };

    const worker = html2pdf()
      .set(options)
      .from(elementToPrint)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(
            `Pág. ${i} / ${totalPages}`,
            pdf.internal.pageSize.getWidth() - 15,
            pdf.internal.pageSize.getHeight() - 8
          );
        }
      });

    await (worker as any).save();
    notify?.('PDF baixado com sucesso!');
  } catch (err) {
    console.error('PDF Error:', err);
    notify?.('Erro ao gerar PDF', 'error');
  } finally {
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
};
