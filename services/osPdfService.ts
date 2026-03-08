import { ServiceOrder, CompanyProfile } from '../types';
import { financeUtils } from './financeUtils';

export const buildOsHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
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
    return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 0; font-size: 10px; font-weight: 600; color: #1e293b; text-transform: uppercase; vertical-align: top;">${item.description}</td>
            <td style="padding: 6px 0; text-align: center; font-size: 10px; font-weight: 600; color: #475569; vertical-align: top;">${item.quantity} ${item.unit || ''}</td>
            <td style="padding: 6px 0; text-align: right; font-size: 10px; color: #475569; vertical-align: top;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 6px 0; text-align: right; font-size: 10px; font-weight: 700; color: #0f172a; vertical-align: top;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
  }).join('');

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS - ${order.id.replace('OS-', '')} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
         <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
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
           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding-left: 15mm !important; padding-right: 15mm !important; } }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 15mm !important; padding-right: 15mm !important; } 
             .no-screen { display: block !important; } 
             .no-print { display: none !important; } 
             .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: 5mm; text-align: center; font-size: 8px; font-weight: bold; color: white !important; text-transform: uppercase; } 
             .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; } 
             
              /* Prevent widowed headings */
              .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4, .ql-editor-print h5, .ql-editor-print h6 { 
                break-after: avoid-page !important; 
                page-break-after: avoid !important; 
                font-weight: 800 !important;
                color: #0f172a !important;
                margin-top: 24px !important;
                margin-bottom: 8px !important;
              }
              .ql-editor-print h1 { font-size: 22px !important; }
              .ql-editor-print h2 { font-size: 19px !important; }
              .ql-editor-print h3 { font-size: 17px !important; }
              .ql-editor-print h4 { font-size: 14px !important; }

              /* Font Classes for Print */
              .ql-font-inter { font-family: 'Inter', sans-serif !important; }
              .ql-font-arial { font-family: Arial, sans-serif !important; }
              .ql-font-roboto { font-family: 'Roboto', sans-serif !important; }
              .ql-font-serif { font-family: serif !important; }
              .ql-font-monospace { font-family: monospace !important; }
              .ql-font-montserrat { font-family: 'Montserrat', sans-serif !important; }
              .ql-font-opensans { font-family: 'Open Sans', sans-serif !important; }
              .ql-font-lato { font-family: 'Lato', sans-serif !important; }
              .ql-font-poppins { font-family: 'Poppins', sans-serif !important; }
              .ql-font-oswald { font-family: 'Oswald', sans-serif !important; }
              .ql-font-playfair { font-family: 'Playfair Display', serif !important; }
              .ql-font-nunito { font-family: 'Nunito', sans-serif !important; }
              
              /* Size Classes for Print */
              .ql-size-10px { font-size: 10px !important; }
              .ql-size-12px { font-size: 12px !important; }
              .ql-size-14px { font-size: 14px !important; }
              .ql-size-16px { font-size: 16px !important; }
              .ql-size-18px { font-size: 18px !important; }
              .ql-size-20px { font-size: 20px !important; }
              .ql-size-24px { font-size: 24px !important; }
              .ql-size-32px { font-size: 32px !important; }
              .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
           }

            /* Shared Rich Text / Quill Styles for all media */
            .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; display: block !important; }
            .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; display: block !important; }
            .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; list-style-position: outside !important; }
            .ql-editor-print strong, .ql-editor-print b { font-weight: bold !important; color: #000 !important; }
            .ql-editor-print em { font-style: italic !important; }
            .ql-editor-print .ql-align-center { text-align: center !important; }
            .ql-editor-print .ql-align-right { text-align: right !important; }
            .ql-editor-print .ql-align-justify { text-align: justify !important; }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <td style="padding: 0;">
                <div class="a4-container" style="padding-bottom: 8mm; border-bottom: 3px solid #0f172a; margin-bottom: 8mm;">
                   <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                       <div style="display: flex; gap: 6mm; align-items: center;">
                           <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                               ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                           </div>
                           <div>
                               <h1 style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 2mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${company.name}</h1>
                               <p style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">Ordem de Serviço de Obra / Reforma</p>
                               <p style="font-size:9px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${company.cnpj || ''} | ${company.phone || ''}</p>
                           </div>
                       </div>
                       <div style="text-align:right;">
                           <div style="background:#2563eb; color:white; padding:2mm 4mm; border-radius:2mm; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:2mm; display:inline-block;">ORDEM DE SERVIÇO</div>
                           <p style="font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-1px; margin:0 0 1mm 0; white-space:nowrap;">${order.id}</p>
                           <p style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:0;">ABERTURA: ${formatDate(order.createdAt || '')}</p>
                       </div>
                   </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 0;">
                <div class="a4-container">
                   <div class="grid grid-cols-2 gap-4 mb-8">
                       <div class="info-box">
                           <span class="info-label">Cliente / Solicitante</span>
                           <div class="info-value">${customer.name}</div>
                           <div class="info-sub mt-1">${customer.document || 'Documento não inf.'}</div>
                       </div>
                       <div class="info-box">
                           <span class="info-label">Detalhes da Obra</span>
                           <div class="info-value">${order.description}</div>
                           <div class="info-sub mt-1">Previsão: ${order.deliveryTime || order.dueDate ? formatDate(order.dueDate || '') : 'A combinar'}</div>
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
                                    <th style="padding-bottom: 4px; text-align: left; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 55%;">Serviço / Item</th>
                                    <th style="padding-bottom: 4px; text-align: center; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 10%;">Qtd</th>
                                    <th style="padding-bottom: 4px; text-align: right; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 17.5%;">Unitário</th>
                                    <th style="padding-bottom: 4px; text-align: right; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 17.5%;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>${itemsHtml}</tbody>
                        </table>

                        <div style="display: flex !important; flex-direction: row !important; justify-content: flex-end !important; gap: 40px !important; align-items: flex-end !important; margin-top: 12px; margin-bottom: 20px; padding: 0 16px;">
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

                        <div class="bg-[#0f172a] text-white p-4 rounded-xl shadow-xl mb-4" style="display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important;">
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

                    <div style="margin-top: 60px !important;" class="avoid-break pt-8">
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
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 0;">
                <div class="a4-container" style="padding-top: 10px !important; border-top: 1px solid #f1f5f9; margin-top: 10px;">
                    <div class="flex justify-between items-center opacity-60">
                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${company.name} - ${company.cnpj || ''}</p>
                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Página 1 de 1</p>
                    </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
        <script>
           function optimizePageBreaks() {
             const root = document.querySelector('.print-description-content .space-y-6');
             if (!root) return;

             const allNodes = [];
             Array.from(root.children).forEach(block => {
               if (block.classList.contains('ql-editor-print')) {
                  allNodes.push(...Array.from(block.children));
               } else {
                  allNodes.push(block);
               }
             });

             for (let i = 0; i < allNodes.length - 1; i++) {
               const el = allNodes[i];
               let isTitle = false;
               
               if (el.matches('h1, h2, h3, h4, h5, h6')) {
                 isTitle = true;
               } else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                  const text = el.innerText.trim();
                  const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
                  const isBold = el.querySelector('strong, b') || 
                                (el.style && (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold')) || 
                                el.tagName === 'STRONG';
                  const isShort = text.length < 150;
                  if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 3)) {
                    isTitle = true;
                  }
               }

               if (isTitle) {
                 const nodesToWrap = [el];
                 let j = i + 1;
                 while (j < allNodes.length && nodesToWrap.length < 3) {
                   const next = allNodes[j];
                   const nextText = next.innerText.trim();
                   const nextIsTitle = next.matches('h1, h2, h3, h4, h5, h6') || 
                                        (/^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(nextText) && (next.querySelector('strong, b') || nextText === nextText.toUpperCase()));
                   if (nextIsTitle) break;
                   nodesToWrap.push(next);
                   j++;
                 }

                 if (nodesToWrap.length > 1) {
                   const wrapper = document.createElement('div');
                   wrapper.className = 'keep-together';
                   el.parentNode.insertBefore(wrapper, el);
                   nodesToWrap.forEach(node => wrapper.appendChild(node));
                   i = j - 1;
                 }
               }
             }
           }
           window.onload = function() { 
             optimizePageBreaks();
              setTimeout(() => { window.print(); window.close(); }, 2000); 
           }
        </script>
      </body>
      </html>`;
};

export const buildMaintenanceOsHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
    } catch {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  const subTotal = order.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
  const bdiValue = order.bdiRate ? subTotal * (order.bdiRate / 100) : 0;
  const subTotalWithBDI = subTotal + bdiValue;
  const taxValue = order.taxRate ? subTotalWithBDI * (order.taxRate / 100) : 0;
  const finalTotal = subTotalWithBDI + taxValue; // Calculate proactively, though order.totalAmount might be used if trusted

  const itemsHtml = order.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #0f172a;">${item.description}</td>
        <td style="padding: 12px 0; text-align: center; color: #94a3b8; font-size: 9px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
        <td style="padding: 12px 0; text-align: center; font-weight: 600; color: #0f172a; font-size: 10px;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #64748b; font-size: 10px; white-space: nowrap;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 11px; color: #0f172a; white-space: nowrap;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`).join('');

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ordem de Serviço - ${order.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
        <style>
           * { box-sizing: border-box; }
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .break-after-avoid { break-after: avoid !important; page-break-after: avoid !important; }
           .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
           
           /* Premium Box Styles */
           .info-box { background: #eff6ff; border-radius: 12px; padding: 20px; border: 1px solid #dbeafe; }
           .info-label { font-size: 9px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
           .info-sub { font-size: 10px; color: #64748b; font-weight: 500; }
           
           .section-title { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }
 
           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 15mm !important; padding-right: 15mm !important; } 
             .no-screen { display: block !important; }
             .no-print { display: none !important; }
             .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: 5mm; text-align: center; font-size: 8px; font-weight: bold; color: white !important; text-transform: uppercase; }
             .ql-editor-print .ql-align-justify { text-align: justify !important; }
             .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
           }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
               <!-- Header -->
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; border-bottom: 3px solid #0f172a; padding-bottom: 8mm;">
                 <div style="display: flex; gap: 6mm; align-items: center;">
                   <div style="display:flex; align-items:center; justify-content:flex-start;">
                     ${company.logo ? `<img src="${company.logo}" style="height: ${company.logoSize || 80}px; max-width: 250px; object-fit:contain;" />` : `<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>`}
                   </div>
                   <div>
                     <h1 style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 2mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${company.name}</h1>
                     <p style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">${company.tagline || 'Soluções em Gestão Profissional'}</p>
                     <p style="font-size:9px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${company.cnpj || ""} | ${company.phone || ""}</p>
                   </div>
                 </div>
                 <div style="text-align:right;">
                   <div style="background:#2563eb; color:white; padding:2mm 4mm; border-radius:2mm; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:2mm; display:inline-block;">ORDEM DE SERVIÇO</div>
                   <p style="font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-1px; margin:0 0 1mm 0; white-space:nowrap;">${order.id}</p>
                   <p style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:0;">ABERTURA: ${formatDate(order.createdAt || '')}</p>
                 </div>
               </div>

               <!-- Boxes Grid (Customer & Equipment) -->
               <div class="grid grid-cols-2 gap-6 mb-12">
                   <div class="info-box">
                       <span class="info-label">Cliente / Solicitante</span>
                       <div class="info-value">${customer.name}</div>
                       <div class="info-sub mt-1">${customer.document || 'Documento não inf.'}</div>
                   </div>
                   <div class="info-box">
                       <span class="info-label">Dados do Equipamento / Objeto</span>
                       <div class="info-value">${order.equipmentBrand || ''} ${order.equipmentModel || 'Não especificado'}</div>
                       <div class="info-sub mt-1">SÉRIE: ${order.equipmentSerialNumber || 'N/A'}</div>
                   </div>
               </div>

               <!-- Technical Report -->
               <div class="mb-12">
                   <div class="section-title">Relatório Técnico / Diagnóstico</div>
                   <div class="info-box bg-slate-50 border border-slate-100">
                       <p class="text-[14px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">${order.serviceDescription || 'Nenhum laudo técnico registrado.'}</p>
                   </div>
               </div>

               ${order.descriptionBlocks && order.descriptionBlocks.length > 0 ? `
               <div class="mb-10 print-description-content">
                   <div class="section-title">DESCRIÇÃO TÉCNICA E ESCOPO</div>
                   <div class="space-y-6">
                       ${order.descriptionBlocks.map((block: any) => {
    if (block.type === 'text') {
      return `<div class="text-slate-700 leading-relaxed text-justify ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px;">${block.content}</div>`;
    } else if (block.type === 'image') {
      return `<div class="avoid-break" style="margin: 20px 0;"><img src="${block.content}" style="width: 100%; max-height: 230mm; border-radius: 12px; border: 1px solid #e2e8f0; display: block; object-fit: contain;"></div>`;
    } else if (block.type === 'page-break') {
      return `<div style="page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0;"></div>`;
    }
    return '';
  }).join('')}
                   </div>
               </div>` : ''}

               <!-- Items Table -->
               <div class="mb-8">
                   <div class="section-title">Peças, Materiais e Serviços</div>
                   <table style="width: 100%; border-collapse: collapse;">
                       <thead>
                           <tr style="border-bottom: 2px solid #0f172a;">
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 700; letter-spacing: 0.05em;">Descrição</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 700; letter-spacing: 0.05em;">UN</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 700; letter-spacing: 0.05em;">Qtd</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 700; letter-spacing: 0.05em;">Unitário</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 700; letter-spacing: 0.05em;">Total</th>
                           </tr>
                       </thead>
                       <tbody>${itemsHtml}</tbody>
                   </table>
               </div>

               <!-- Total Bar (Dark) -->
               <div class="avoid-break mb-12">
                   <!-- Breakdown ABOVE the bar (Per user request) -->
                   <div class="flex justify-end mb-2 gap-6 px-2">
                        <div class="text-right">
                           <span class="text-[8px] font-medium text-slate-400 uppercase block">Subtotal</span>
                           <span class="text-[10px] font-bold text-slate-600 block" style="white-space: nowrap;">R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        ${order.bdiRate ? `
                        <div class="text-right">
                           <span class="text-[8px] font-medium text-slate-400 uppercase block">BDI (${order.bdiRate}%)</span>
                           <span class="text-[10px] font-bold text-emerald-600 block" style="white-space: nowrap;">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>` : ''}
                        ${order.taxRate ? `
                        <div class="text-right">
                           <span class="text-[8px] font-medium text-slate-400 uppercase block">Impostos (${order.taxRate}%)</span>
                           <span class="text-[10px] font-bold text-blue-600 block" style="white-space: nowrap;">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>` : ''}
                   </div>
                   <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-xl">
                       <span class="text-[12px] font-bold uppercase tracking-widest">Valor Total:</span>
                       <span class="text-3xl font-bold text-white tracking-tighter text-right" style="white-space: nowrap;">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                   </div>
               </div>

               <!-- Legal / Guarantee -->
               <div class="avoid-break mb-12">
                   <div class="border-l-4 border-blue-600 bg-blue-50/40 p-6 rounded-xl">
                       <h5 class="text-[14px] font-bold text-blue-600 uppercase tracking-widest mb-2">Garantia e Notas Legais</h5>
                       <p class="text-[13px] text-slate-700 leading-tight mb-2"><b>• GARANTIA TÉCNICA:</b> 90 dias para os serviços executados (Art. 26 CDC).</p>
                       <p class="text-[13px] text-rose-600 font-bold uppercase leading-tight"><b>• ATENÇÃO:</b> Equipamentos não retirados em até 30 dias após aviso de conclusão estarão sujeitos a taxas de armazenamento ou descarte legal.</p>
                   </div>
               </div>

               <!-- Signatures -->
               <div style="margin-top: 120px !important;" class="avoid-break pt-32">
                   <div class="grid grid-cols-2 gap-16 px-10">
                       <div class="text-center">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                           <p class="text-[10px] font-bold uppercase text-slate-900">${company.name}</p>
                       </div>
                       <div class="text-center relative">
                           ${order.signature ? `<img src="${order.signature}" style="max-height: 50px; position: absolute; top: -45px; left: 50%; transform: translateX(-50%);">` : ''}
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assinatura do Cliente</p>
                           <p class="text-[10px] font-bold uppercase text-slate-900">${order.customerName}</p>
                       </div>
                   </div>
               </div>
            </div>
          </td></tr></tbody>
          <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;"><div style="height: ${company.printMarginBottom || 15}mm; display: block;">&nbsp;</div></td></tr></tfoot>
        </table>
        <script>
           function optimizePageBreaks() {
             const root = document.querySelector('.print-description-content .space-y-6');
             if (!root) return;

             const allNodes = [];
             Array.from(root.children).forEach(block => {
               if (block.classList.contains('ql-editor-print')) {
                  allNodes.push(...Array.from(block.children));
               } else {
                  allNodes.push(block);
               }
             });

             for (let i = 0; i < allNodes.length - 1; i++) {
               const el = allNodes[i];
               let isTitle = false;
               
               if (el.matches('h1, h2, h3, h4, h5, h6')) {
                 isTitle = true;
               } else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                 const text = el.innerText.trim();
                 const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
                 const isBold = el.querySelector('strong, b') || 
                               (el.style && (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold')) || 
                               el.tagName === 'STRONG';
                 const isShort = text.length < 150;
                 if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 3)) {
                   isTitle = true;
                 }
               }

               if (isTitle) {
                 const nodesToWrap = [el];
                 let j = i + 1;
                 while (j < allNodes.length && nodesToWrap.length < 3) {
                   const next = allNodes[j];
                   const nextText = next.innerText.trim();
                   const nextIsTitle = next.matches('h1, h2, h3, h4, h5, h6') || 
                                      (/^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(nextText) && (next.querySelector('strong, b') || nextText === nextText.toUpperCase()));
                   if (nextIsTitle) break;
                   nodesToWrap.push(next);
                   j++;
                 }

                 if (nodesToWrap.length > 1) {
                   const wrapper = document.createElement('div');
                   wrapper.className = 'keep-together';
                   el.parentNode.insertBefore(wrapper, el);
                   nodesToWrap.forEach(node => wrapper.appendChild(node));
                   i = j - 1;
                 }
               }
             }
           }
           window.onload = function() { 
             optimizePageBreaks();
             setTimeout(() => { window.print(); window.close(); }, 2000); 
           }
        </script>
      </body>
      </html>`;
};
