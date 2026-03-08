import html2pdf from 'html2pdf.js';
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
  const vDate = budget.dueDate ? formatDate(budget.dueDate) : formatDate(new Date(new Date(budget.createdAt || Date.now()).getTime() + vDays * 24 * 60 * 60 * 1000).toISOString());

  return `
    <div style="padding-bottom: 25px !important; border-bottom: 3px solid #000; margin-bottom: 25px;">
       <div style="display: flex; justify-content: space-between; align-items: center;">
           <div style="display: flex; gap: 24px; align-items: center;">
               <div style="display: flex; align-items: center; justify-content: flex-start;">
                   ${company.logo ? `<img src="${company.logo}" style="height: ${company.logoSize || 80}px; max-width: 250px; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#1e3a8a;">PRIME</div>'}
               </div>
               <div>
                   <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.2; margin: 0 0 2px 0; text-transform: uppercase;">${escapeHtml(company.name)}</h1>
                   <p style="margin: 0; font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.02em;">SOLUÇÕES em Gestão Profissional</p>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b; font-weight: 500;">${escapeHtml(company.cnpj || '')} | ${escapeHtml(company.phone || '')}</p>
               </div>
           </div>
           <div style="text-align: right;">
               <p style="margin: 0; font-size: 24px; font-weight: 800; color: #2563eb;">${budget.id}</p>
               <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">EMISSÃO: ${eDate}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">VALIDADE: ${vDate}</p>
           </div>
       </div>
    </div>`;
};

export const buildBudgetFooterHtml = (company: CompanyProfile) => {
  const vDays = company.defaultProposalValidity || 15;
  return `
    <div style="margin-top: 32px; break-inside: avoid;">
        <div style="border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 24px;">
             <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                 <div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">?</div>
                 <span style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em;">TERMO DE ACEITE E AUTORIZAÇÃO PROFISSIONAL</span>
             </div>
             <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6; text-align: justify; font-weight: 600;">
                 "Este documento constitui uma proposta comercial formal. Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações técnicas descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. A contratada reserva-se o direito de renegociar valores caso a aprovação ocorra após o prazo de validade de ${vDays} dias. Eventuais alterações de escopo solicitadas após o aceite estarão sujeitas a nova análise de custos."
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
        // Assume text block from rich editor comes sanitized via Quill or is intentional rich text.
        // We inject as-is to preserve HTML formatting from Quill.
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
    </tr>`).join('');

  return `
      <!-- Items Table -->
      <div style="margin-top: 20px; margin-bottom: 20px;">
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

// CORREÇÃO AQUI:
// removido o table/thead/tfoot que estava reservando espaço fantasma nas páginas seguintes do PDF
export const generateBudgetReportHtml = (budget: ServiceOrder, company: CompanyProfile, customerDoc?: string) => {
  return `
    <div class="a4-container">
      <div style="margin-bottom: 25px;">
        ${buildBudgetHeaderHtml(budget, company)}
      </div>
      ${getBudgetBodyHtml(budget, company, customerDoc)}
      ${buildBudgetFooterHtml(company)}
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
      const isBold = el.querySelector('strong, b') ||
        (el.style && (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold')) ||
        el.classList.contains('font-bold') ||
        el.tagName === 'STRONG';
      const isShort = text.length < 150;

      if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 3)) {
        isTitle = true;
      }
    }

    if (isTitle) {
      const nodesToWrap = [el];
      let j = i + 1;
      while (j < allNodes.length && nodesToWrap.length < 2) {
        const next = allNodes[j] as HTMLElement;
        const nextText = next.innerText.trim();
        const nextIsTitle = next.matches('h1, h2, h3, h4, h5, h6') ||
          (/^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(nextText) && (next.querySelector('strong, b') || nextText === nextText.toUpperCase() || (next.style && next.style.fontWeight === 'bold')));

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

export const printBudget = (budget: ServiceOrder, company: CompanyProfile, customerDoc?: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = generateBudgetReportHtml(budget, company, customerDoc);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Orçamento - ${budget.id}</title>
       <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
      <style>
         * { box-sizing: border-box; }
         body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
         @page { size: A4; margin: 0 !important; }
         .a4-container { width: 100%; margin: 0; background: white; padding: 0 15mm !important; }
         .avoid-break { break-inside: avoid; page-break-inside: avoid; }
         .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
         
         @media print { 
            @page { margin: 0; size: A4; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; } 
            .a4-container { box-shadow: none !important; border: none !important; width: 100% !important; padding: 0 15mm !important; margin: 0 !important; }
         }

          /* Estilos do Editor de Texto Rico no Print */
          .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
          .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
          .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
          .ql-editor-print strong, .ql-editor-print b { font-weight: bold !important; color: #000 !important; }
          .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4 { font-weight: 800 !important; color: #0f172a !important; margin-top: 20px !important; margin-bottom: 10px !important; break-after: avoid !important; }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
         function optimizePageBreaks() {
           const root = document.querySelector('.print-description-content');
           if (!root) return;
           const content = root.querySelector('div:last-child');
           if (!content) return;

           const allNodes = [];
           Array.from(content.children).forEach(block => {
             if (block.classList.contains('ql-editor-print')) {
                allNodes.push(...Array.from(block.children));
             } else {
                allNodes.push(block);
             }
           });

           for (let i = 0; i < allNodes.length - 1; i++) {
             const el = allNodes[i];
             let isTitle = false;
             
             if (el.matches('h1, h2, h3, h4, h5, h6')) isTitle = true;
             else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                const text = el.innerText.trim();
                const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
                const isBold = el.querySelector('strong, b') || (el.style && (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold')) || el.classList.contains('font-bold') || el.tagName === 'STRONG';
                const isShort = text.length < 150;
                if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 3)) {
                  isTitle = true;
                }
             }

             if (isTitle) {
               const nodesToWrap = [el];
               let j = i + 1;
               while (j < allNodes.length && nodesToWrap.length < 2) {
                 const next = allNodes[j];
                 const nextText = next.innerText.trim();
                 const nextIsTitle = next.matches('h1, h2, h3, h4, h5, h6') || 
                                   (/^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(nextText) && (next.querySelector('strong, b') || nextText === nextText.toUpperCase() || (next.style && next.style.fontWeight === 'bold')));
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
                 nodesToWrap.forEach(node => wrapper.appendChild(node));
                 i = j - 1;
               }
             }
           }
         }
         window.onload = function() { 
           optimizePageBreaks();
           setTimeout(() => { window.print(); }, 1000); 
         }
      </script>
    </body>
    </html>`;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const downloadBudgetPdf = async (budget: ServiceOrder, company: CompanyProfile, customerDoc?: string, notify?: (msg: string, type?: string) => void) => {
  let container: HTMLDivElement | null = null;

  try {
    if (notify) notify("Gerando PDF...");

    // CORREÇÃO AQUI:
    // agora usa o HTML completo sem thead/tfoot para evitar o espaço fantasma nas páginas seguintes
    const htmlContent = generateBudgetReportHtml(budget, company, customerDoc);

    container = document.createElement("div");
    container.id = "pdf-temp-root";
    Object.assign(container.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "210mm",
      background: "white",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "999999",
    });

    const head = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: white; color: #000; }
        .pdf-page { width: 210mm; background: white; margin: 0; padding: 0; }
        .a4-container { width: 100%; background: white; padding: 0 15mm; }
        .avoid-break, .keep-together { break-inside: avoid; page-break-inside: avoid; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        tr { break-inside: auto !important; }
        
        .pdf-header { margin-bottom: 25px; }
        .pdf-footer { margin-top: 32px; }

        .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
        .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
        .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
        .ql-editor-print strong, .ql-editor-print b { font-weight: bold !important; color: #000 !important; }
        .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4 {
          font-weight: 800 !important; color: #0f172a !important;
          margin-top: 20px !important; margin-bottom: 10px !important;
          break-after: avoid !important;
        }
      </style>
    `;

    container.innerHTML = `
      ${head}
      <div class="pdf-page">
        ${htmlContent}
      </div>
    `;

    document.body.appendChild(container);

    runOptimizePageBreaks(container);

    const elementToPrint = container.querySelector(".pdf-page") as HTMLElement;
    if (!elementToPrint) throw new Error("Elemento de impressão não encontrado.");

    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if ((img as HTMLImageElement).complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      })
    );

    if ("fonts" in document) {
      // @ts-ignore
      await document.fonts.ready;
    }

    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const safeDescription = (budget.description || "Proposta").replace(/[\\/:"*?<>|]/g, "_").trim();
    const filename = `${budget.id} - ${safeDescription}.pdf`;

    const options = {
      margin: [15, 0, 15, 0] as [number, number, number, number],
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        letterRendering: true,
        windowWidth: 1200,
      },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["css", "legacy"] as any },
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

    if (notify) notify("PDF baixado com sucesso!");
  } catch (err) {
    console.error("PDF Error:", err);
    if (notify) notify("Erro ao gerar PDF", "error");
  } finally {
    if (container?.parentNode) container.parentNode.removeChild(container);
  }
};