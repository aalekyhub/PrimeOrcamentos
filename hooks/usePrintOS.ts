import { ServiceOrder, CompanyProfile, Customer } from '../types';
import { financeUtils } from '../services/financeUtils';
import { PRINT_FONTS, commonPrintStyles, getOptimizePageBreaksScript } from '../services/printUtils';

export const usePrintOS = (customers: Customer[], company: CompanyProfile) => {
  const handlePrintOS = (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, address: 'Não informado', document: 'N/A' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
      } catch {
        return new Date().toLocaleDateString('pt-BR');
      }
    };

    const { subtotal, bdiValue, taxValue, finalTotal } = financeUtils.getDetailedFinancials(order);

    const itemFontBase = company.itemsFontSize || 12;

    const itemsHtml = order.items.map((item) => {
      const total = item.quantity * item.unitPrice;
      return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 10px 10px 0; text-align: left; vertical-align: middle; width: 60%;">
            <div style="font-weight: 700; text-transform: uppercase; font-size: ${itemFontBase}px; color: #0f172a;">${item.description}</div>
        </td>
        <td style="padding: 10px 10px; text-align: center; vertical-align: middle; color: #0f172a; font-size: ${itemFontBase}px; font-weight: 700; width: 10%;">${item.quantity} ${item.unit || 'un'}</td>
        <td style="padding: 10px 10px; text-align: right; vertical-align: middle; color: #64748b; font-size: ${itemFontBase}px; font-weight: 700; width: 15%;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px 0 10px 10px; text-align: right; vertical-align: middle; font-weight: 800; font-size: ${itemFontBase + 1}px; color: #0f172a; width: 15%;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS - ${order.id.replace('OS-', '')} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
         ${PRINT_FONTS}
         ${commonPrintStyles(company)}
         <style>
             .info-box { padding: 16px; }
             .info-label { font-size: 9px; }
             .info-value { font-size: 11px; }
             .section-title { font-size: 9px; margin-top: 24px; }
         </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
               <div class="flex justify-between items-start mb-8 border-b-[3px] border-slate-900 pb-6">
                   <div class="flex gap-6 items-center">
                       <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-3xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Ordem de Serviço de Obra / Reforma</p>
                           <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">ORDEM DE SERVIÇO</div>
                       <p class="text-2xl font-black text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">${order.id}</p>
                       <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">ABERTURA: ${formatDate(order.createdAt)}</p>
                   </div>
               </div>

               <div class="grid grid-cols-2 gap-4 mb-8">
                   <div class="info-box">
                       <span class="info-label">Cliente / Solicitante</span>
                       <div class="info-value">${customer.name}</div>
                       <div class="info-sub mt-1">${customer.document || 'Documento não inf.'}</div>
                   </div>
                   <div class="info-box">
                       <span class="info-label">Detalhes da Obra</span>
                       <div class="info-value">${order.description}</div>
                       <div class="info-sub mt-1">Previsão: ${order.deliveryTime || order.dueDate ? formatDate(order.dueDate) : 'A combinar'}</div>
                   </div>
               </div>

                ${order.descriptionBlocks && order.descriptionBlocks.length > 0 ? `
                <div class="mb-10 print-description-content">
                    <div class="section-title">DESCRIÇÃO TÉCNICA</div>
                    <div class="space-y-6">
                        ${order.descriptionBlocks.map(block => {
      if (block.type === 'text') {
        return `<div class="text-slate-800 leading-relaxed text-justify font-medium ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px;">${block.content}</div>`;
      } else if (block.type === 'image') {
        return `<div class="avoid-break" style="margin: 20px 0;"><img src="${block.content}" style="width: 100%; max-height: 230mm; border-radius: 12px; object-fit: contain; display: block;"></div>`;
      } else if (block.type === 'page-break') {
        return `<div style="page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0;"></div>`;
      }
      return '';
    }).join('')}
                    </div>
                </div>` : ''}

                 <div class="avoid-break mb-8 overflow-hidden">
                    <div class="section-title">Detalhamento Financeiro</div>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                        <thead>
                            <tr style="border-bottom: 2px solid #0f172a;">
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; width: 60%;">Item / Descrição</th>
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 10%;">Qtd</th>
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; width: 15%;">Unitário</th>
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; width: 15%;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>

                    <div style="display: flex !important; flex-direction: row !important; justify-content: flex-end !important; gap: 40px !important; align-items: flex-end !important; margin-top: 16px; margin-bottom: 24px; padding: 0 16px;">
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

                    <div class="bg-[#0f172a] text-white p-5 rounded-2xl shadow-xl mb-4" style="display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important;">
                        <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; opacity: 0.8 !important;">INVESTIMENTO TOTAL:</p>
                        <p style="font-size: 32px; font-weight: 900; letter-spacing: -0.05em; margin: 0 !important; line-height: 1 !important;">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div class="avoid-break mb-8" style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 16px !important;">
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <p class="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-2" style="display: block;">Forma de Pagamento</p>
                        <p class="text-slate-700 text-[${Math.max(13, (company.descriptionFontSize || 12))}px] font-bold leading-relaxed">${order.paymentTerms || 'A combinar com o responsável.'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <p class="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-2" style="display: block;">Prazo de Entrega / Execução</p>
                        <p class="text-slate-700 text-[${Math.max(13, (company.descriptionFontSize || 12))}px] font-bold leading-relaxed">${order.deliveryTime || 'Conforme cronograma da obra.'}</p>
                    </div>
                </div>

                <div style="margin-top: 120px !important;" class="avoid-break pt-32">
                   <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 64px !important; padding: 0 40px !important;">
                       <div class="text-center">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                           <p class="text-[10px] font-bold uppercase text-slate-900">${company.name}</p>
                       </div>
                        <div class="text-center relative">
                            <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                            <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assinatura do Cliente</p>
                            <p class="text-[11px] font-bold uppercase text-slate-900">${order.customerName}</p>
                        </div>
                   </div>
               </div>
            </div>
          </td></tr></tbody>
          <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;"><div style="height: ${company.printMarginBottom || 15}mm; display: block;">&nbsp;</div></td></tr></tfoot>
        </table>
        <script>
           ${getOptimizePageBreaksScript()}
           window.onload = function() { 
             optimizePageBreaks();
              setTimeout(() => { window.print(); window.close(); }, 2000); 
           }
        </script>
      </body>
      </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return { handlePrintOS };
};
