import { ServiceOrder, CompanyProfile, Customer } from '../types';
import { financeUtils } from '../services/financeUtils';

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

        const formatLegacyText = (text: string) => {
            if (!text) return '';
            if (/<[a-z][\s\S]*>/i.test(text)) return text;
            return text.replace(/\n/g, '<br/>');
        };

        const itemsHtml = order.items.map((item) => {
            const total = item.quantity * item.unitPrice;
            return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px; text-align: left; vertical-align: middle;">
            <div style="font-weight: 700; text-transform: uppercase; font-size: ${itemFontBase}px; color: #0f172a;">${item.description}</div>
        </td>
        <td style="padding: 10px 0; text-align: center; vertical-align: middle; color: #64748b; font-size: ${Math.max(8, itemFontBase - 1)}px; font-weight: 700; text-transform: uppercase;">${item.type || 'SERV'}</td>
        <td style="padding: 10px 0; text-align: center; vertical-align: middle; color: #0f172a; font-size: ${itemFontBase}px; font-weight: 700;">${item.quantity} ${item.unit || 'un'}</td>
        <td style="padding: 10px 0; text-align: right; vertical-align: middle; color: #64748b; font-size: ${itemFontBase}px; font-weight: 700;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; text-align: right; vertical-align: middle; font-weight: 800; font-size: ${itemFontBase + 1}px; color: #0f172a;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`;
        }).join('');

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS - ${order.id.replace('OS-', '')} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
           * { box-sizing: border-box; }
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .info-box { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
           .info-label { font-size: 9px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.3; }
           .info-sub { font-size: 10px; color: #64748b; font-weight: 600; }
           .section-title { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px; }
           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 20mm !important; padding-right: 20mm !important; } 
             .no-screen { display: block !important; } 
             .no-print { display: none !important; } 
             .print-footer { display: none !important; } 
             .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; } 
             
             /* Styles for Rich Text (Quill) */
             .ql-editor-print p { margin-bottom: 8px !important; }
             .ql-editor-print ul { list-style-type: disc !important; padding-left: 25px !important; margin: 12px 0 !important; }
             .ql-editor-print ol { list-style-type: decimal !important; padding-left: 25px !important; margin: 12px 0 !important; }
             .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; list-style-position: outside !important; }
             .ql-editor-print strong { font-weight: 800 !important; color: #0f172a !important; }
             .ql-editor-print em { font-style: italic !important; }
             .ql-editor-print h1 { font-size: 2em !important; font-weight: 800 !important; margin: 16px 0 8px 0 !important; }
             .ql-editor-print h2 { font-size: 1.5em !important; font-weight: 800 !important; margin: 14px 0 6px 0 !important; }
             .ql-editor-print h3 { font-size: 1.17em !important; font-weight: 800 !important; margin: 12px 0 4px 0 !important; }
             .ql-editor-print .ql-align-center { text-align: center !important; }
             .ql-editor-print .ql-align-right { text-align: right !important; }
             .ql-editor-print .ql-align-justify { text-align: justify !important; }
           }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
               <div class="flex justify-between items-start mb-8 border-b-[3px] border-slate-900 pb-6">
                   <div class="flex gap-6 items-center">
                       <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:28px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-2xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Ordem de Serviço de Obra / Reforma</p>
                           <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">ORDEM DE SERVIÇO</div>
                       <p class="text-xl font-black text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">${order.id}</p>
                       <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">ABERTURA: ${formatDate(order.createdAt)}</p>
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
               <div class="mb-8">
                   <div class="section-title">DESCRIÇÃO TÉCNICA</div>
                   <div class="space-y-4">
                       ${order.descriptionBlocks.map(block => {
            if (block.type === 'text') {
                return `<div class="text-slate-800 leading-relaxed text-justify font-medium ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px; margin-bottom: 16px;">${block.content}</div>`;
            } else if (block.type === 'image') {
                return `<div style="break-inside: avoid; page-break-inside: avoid; margin: 15px 0;"><img src="${block.content}" style="width: 100%; max-height: 230mm; border-radius: 12px; object-fit: contain;"></div>`;
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
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; width: 45%;">Item / Descrição</th>
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 10%;">Tipo</th>
                                <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 15%;">Qtd</th>
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
                        <p class="text-slate-700 text-[${company.descriptionFontSize || 12}px] font-bold leading-relaxed">${order.paymentTerms || 'A combinar com o responsável.'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <p class="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-2" style="display: block;">Prazo de Entrega / Execução</p>
                        <p class="text-slate-700 text-[${company.descriptionFontSize || 12}px] font-bold leading-relaxed">${order.deliveryTime || 'Conforme cronograma da obra.'}</p>
                    </div>
                </div>

                <div class="avoid-break mt-auto pt-8">
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
        <div class="print-footer no-screen"><span>Página 1 de 1</span></div>
        <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 1200); }</script>
      </body>
      </html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return { handlePrintOS };
};
