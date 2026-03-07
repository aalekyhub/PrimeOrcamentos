import html2pdf from 'html2pdf.js';
import { ServiceOrder, ServiceItem, CompanyProfile, DescriptionBlock } from '../types';

const FONT = `'Inter', sans-serif`;

const escapeHtml = (v: any = '') => String(v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const currency = (v: any) => num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const date = (v?: any) => {
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-BR');
    return d.toLocaleDateString('pt-BR');
  } catch { return new Date().toLocaleDateString('pt-BR'); }
}

const sanitizeRich = (html: any) => {
  if (!html) return '';
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script,iframe,object,embed').forEach(e => e.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      if (a.name.startsWith('on')) el.removeAttribute(a.name);
      if ((a.name === 'href' || a.name === 'src') && a.value.startsWith('javascript')) el.removeAttribute(a.name);
    })
  });
  return doc.body.innerHTML;
}

const calcTotals = (budget: ServiceOrder) => {
  const items = Array.isArray(budget.items) ? budget.items : [];
  const subtotal = items.reduce((a, i) => a + (num(i.quantity) * num(i.unitPrice)), 0);
  const bdi = Math.max(0, num(budget.bdiRate));
  const tax = Math.min(99.9, Math.max(0, num(budget.taxRate)));

  const bdiVal = subtotal * (bdi / 100);
  const subtotalBDI = subtotal + bdiVal;
  const final = subtotalBDI / (1 - tax / 100);
  const taxVal = final - subtotalBDI;

  return { items, subtotal, bdi, bdiVal, tax, taxVal, final }
}

const styles = () => `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0;font-family:${FONT};background:white}

.a4{
 width:210mm;
 padding:0 15mm;
 margin:0 auto;
}

.pdf-header{margin-bottom:20px}

.pdf-footer{margin-top:40px}

.keep{break-inside:avoid;page-break-inside:avoid}

.print-description-inner{width:100%}

.ql-editor-print ul{padding-left:28px;margin:12px 0}
.ql-editor-print ol{padding-left:28px;margin:12px 0}

@page{size:A4;margin:0}
`;

export const buildHeader = (budget: ServiceOrder, company: CompanyProfile) => {

  const logo = company.logo
    ? `<img src="${company.logo}" style="height:${num(company.logoSize) || 80}px;object-fit:contain">`
    : `<div style="font-weight:900;font-size:32px;color:#1e3a8a">PRIME</div>`

  return `
<div style="padding-bottom:20px;border-bottom:3px solid #000">

<div style="display:flex;justify-content:space-between;align-items:center;gap:20px">

<div style="display:flex;gap:20px;align-items:center">

${logo}

<div>

<h1 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;text-transform:uppercase">${escapeHtml(company.name)}</h1>

<p style="margin:2px 0;font-size:11px;color:#3b82f6;font-weight:700">SOLUÇÕES EM GESTÃO PROFISSIONAL</p>

<p style="margin:4px 0;font-size:10px;color:#64748b">${escapeHtml(company.cnpj)} | ${escapeHtml(company.phone)}</p>

</div>

</div>

<div style="text-align:right">

<p style="margin:0;font-size:26px;font-weight:900;color:#2563eb">${escapeHtml(budget.id)}</p>

<p style="margin:2px 0;font-size:10px;font-weight:700">EMISSÃO: ${date(budget.createdAt)}</p>

<p style="margin:2px 0;font-size:10px;font-weight:700">VALIDADE: ${date(budget.dueDate)}</p>

</div>

</div>

</div>
`;
}

export const clientBox = (budget: ServiceOrder, doc?: string) => `
<div style="display:flex;gap:20px;margin:35px 0">

<div style="flex:1;background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0">

<span style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase">CLIENTE / DESTINATÁRIO</span>

<div style="font-size:13px;font-weight:800;margin-top:6px">${escapeHtml(budget.customerName)}</div>

<div style="font-size:11px;color:#64748b">${escapeHtml(doc)}</div>

</div>

<div style="flex:1;background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0">

<span style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase">REFERÊNCIA DO ORÇAMENTO</span>

<div style="font-size:13px;font-weight:800;margin-top:6px">${escapeHtml(budget.description)}</div>

</div>

</div>`

export const description = (budget: ServiceOrder, company: CompanyProfile) => {

  let html = `
<div style="margin-bottom:30px">
<h2 style="font-size:11px;color:#334155;text-transform:uppercase">PROPOSTA COMERCIAL</h2>
<p style="font-size:20px;font-weight:800;color:#2563eb">${escapeHtml(budget.description)}</p>
</div>`

  if (Array.isArray(budget.descriptionBlocks)) {

    html += `
<div class="print-description-inner">

${budget.descriptionBlocks.map((b: DescriptionBlock) => {

      if (b.type === 'text')
        return `<div class="ql-editor-print" style="font-size:${num(company.descriptionFontSize) || 14}px;color:#334155;line-height:1.6;margin-bottom:22px">${sanitizeRich(b.content)}</div>`

      if (b.type === 'image')
        return `<div style="text-align:center;margin:25px 0" class="keep"><img src="${b.content}" style="max-width:100%;border-radius:8px"></div>`

      if (b.type === 'page-break')
        return `<div style="page-break-after:always"></div>`

      return ''

    }).join('')}

</div>`

  }

  return html

}

export const itemsTable = (budget: ServiceOrder, company: CompanyProfile) => {

  const items = Array.isArray(budget.items) ? budget.items : []
  const fs = num(company.itemsFontSize) || 12

  return `

<div style="margin-top:25px">

<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">DETALHAMENTO FINANCEIRO</div>

<table style="width:100%;border-collapse:collapse">

<thead>
<tr style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">

<th style="text-align:left;font-size:10px">ITEM</th>
<th style="text-align:center;font-size:10px">QTD</th>
<th style="text-align:right;font-size:10px">UNITÁRIO</th>
<th style="text-align:right;font-size:10px">SUBTOTAL</th>

</tr>
</thead>

<tbody>

${items.map((i: ServiceItem) => {

    const q = num(i.quantity)
    const p = num(i.unitPrice)

    return `
<tr style="border-bottom:1px solid #e2e8f0">

<td style="padding:8px 0;font-size:${fs}px;font-weight:600">${escapeHtml(i.description)}</td>

<td style="text-align:center;font-size:${fs}px">${q} ${escapeHtml(i.unit)}</td>

<td style="text-align:right;font-size:${fs}px">R$ ${currency(p)}</td>

<td style="text-align:right;font-size:${fs}px;font-weight:700">R$ ${currency(q * p)}</td>

</tr>`

  }).join('')}

</tbody>

</table>

</div>`

}

export const totals = (budget: ServiceOrder) => {

  const { subtotal, bdi, bdiVal, tax, taxVal, final } = calcTotals(budget)

  return `

<div style="margin-top:20px">

<div style="display:flex;justify-content:flex-end;gap:40px;margin-bottom:10px">

<div style="text-align:right">
<span style="font-size:9px;color:#94a3b8">SUBTOTAL</span>
<div style="font-weight:700">R$ ${currency(subtotal)}</div>
</div>

<div style="text-align:right">
<span style="font-size:9px;color:#94a3b8">BDI (${bdi}%)</span>
<div style="font-weight:700;color:#10b981">+ R$ ${currency(bdiVal)}</div>
</div>

<div style="text-align:right">
<span style="font-size:9px;color:#94a3b8">IMPOSTOS (${tax}%)</span>
<div style="font-weight:700;color:#3b82f6">+ R$ ${currency(taxVal)}</div>
</div>

</div>

<div style="background:#0f172a;color:white;padding:12px 30px;border-radius:10px;display:flex;justify-content:space-between">

<span style="font-size:14px;font-weight:900">INVESTIMENTO TOTAL</span>

<span style="font-size:36px;font-weight:900">R$ ${currency(final)}</span>

</div>

</div>`

}

export const terms = (budget: ServiceOrder) => `

<div style="margin-top:25px" class="keep">

<div style="display:flex;gap:20px">

<div style="flex:1;background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0">

<span style="font-size:10px;font-weight:700;color:#3b82f6">FORMA DE PAGAMENTO</span>

<p style="margin-top:6px;font-size:12px;font-weight:600">${escapeHtml(budget.paymentTerms)}</p>

</div>

<div style="flex:1;background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0">

<span style="font-size:10px;font-weight:700;color:#3b82f6">PRAZO DE EXECUÇÃO</span>

<p style="margin-top:6px;font-size:12px;font-weight:600">${escapeHtml(budget.deliveryTime)}</p>

</div>

</div>

</div>`

export const footer = (company: CompanyProfile) => `

<div class="pdf-footer">

<div style="margin-top:60px">

<div style="border-bottom:2px solid #cbd5e1;width:400px"></div>

<p style="font-size:10px;font-weight:700;color:#64748b">ASSINATURA DO CLIENTE / ACEITE</p>

</div>

</div>`

export const body = (budget: ServiceOrder, company: CompanyProfile, doc?: string) => `

${clientBox(budget, doc)}

${description(budget, company)}

${itemsTable(budget, company)}

${totals(budget)}

${terms(budget)}

`

export const buildHtml = (budget: ServiceOrder, company: CompanyProfile, doc?: string) => `

<div class="a4">

${buildHeader(budget, company)}

${body(budget, company, doc)}

${footer(company)}

</div>

`

export const printBudget = async (budget: ServiceOrder, company: CompanyProfile, doc?: string) => {

  const w = window.open('', '_blank');

  if (!w) return;

  w.document.write(`

<html>

<head>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">

<style>${styles()}</style>

</head>

<body>

${buildHtml(budget, company, doc)}

</body>

</html>`);

  w.document.close();

  setTimeout(() => {

    w.print();

  }, 500)

}

export const downloadBudgetPdf = async (budget: ServiceOrder, company: CompanyProfile, doc?: string) => {

  const container = document.createElement('div');

  container.style.position = 'fixed';
  container.style.left = '-100000px';
  container.style.top = '0';
  container.style.width = '210mm';

  container.innerHTML = `

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">

<style>${styles()}</style>

${buildHtml(budget, company, doc)}

`


  document.body.appendChild(container);

  const element = container.querySelector('.a4');

  const filename = `${budget.id} - ${budget.description}.pdf`.replace(/[\\/:"*?<>|]/g, '_');

  await html2pdf()
    .set({
      margin: [10, 0, 15, 0],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: '#fff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    })
    .from(element)
    .save();

  container.remove();

}
