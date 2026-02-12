
import html2pdf from 'html2pdf.js';
import { CompanyProfile, ServiceOrder } from '../types';

export const PRINT_FONTS = [
    'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Poppins', 'Oswald',
    'Playfair Display', 'Nunito', 'Arial'
].map(font => `<link href="https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}:wght@400;700;800;900&display=swap" rel="stylesheet">`).join('');

export const commonPrintStyles = (company: CompanyProfile) => `
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    @page { size: A4; margin: 0 !important; }
    .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .break-after-avoid { break-after: avoid !important; page-break-after: avoid !important; }
    .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
    
    .info-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
    .info-label { font-size: ${Math.max(10, (company.descriptionFontSize || 12))}px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
    .info-value { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
    .info-sub { font-size: 10px; color: #475569; font-weight: 500; }
    
    .section-title { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }

    @media screen { 
      body { background: #f1f5f9; padding: 40px 0; } 
      .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } 
    }
    @media print { 
      body { background: white !important; margin: 0 !important; } 
      .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 15mm !important; padding-right: 15mm !important; } 
      .no-screen { display: block !important; }
      .no-print { display: none !important; }
      .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: 5mm; text-align: center; font-size: 8px; font-weight: bold; color: white !important; text-transform: uppercase; }
      
      .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
      .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
      .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
      .ql-editor-print strong { font-weight: bold !important; }
      
      .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4 { 
        break-after: avoid-page !important; 
        page-break-after: avoid !important; 
        font-weight: 800 !important;
        color: #0f172a !important;
        margin-top: 24px !important;
        margin-bottom: 8px !important;
      }
    }
  </style>
`;

export const getOptimizePageBreaksScript = () => `
  function optimizePageBreaks() {
    const root = document.querySelector('.print-description-content');
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
      
      if (el.matches('h1, h2, h3, h4, h5, h6')) isTitle = true;
      else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
        const text = el.innerText.trim();
        const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
        const hasBoldStyle = el.querySelector('strong, b, [style*="font-weight: bold"], [style*="font-weight: 700"]');
        const isBold = hasBoldStyle || (el.style && parseInt(el.style.fontWeight) > 600) || el.tagName === 'STRONG';
        const isShort = text.length < 150;
        if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 4)) {
          isTitle = true;
        }
      }

      if (isTitle) {
        const nodesToWrap = [el];
        let j = i + 1;
        while (j < allNodes.length && nodesToWrap.length < 3) {
          const next = allNodes[j];
          if (next.matches('h1, h2, h3, h4, h5, h6')) break;
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
`;

export const handleGeneratePDF = (html: string, filename: string, notify: any) => {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
        position: 'fixed', left: '0', top: '0', width: '210mm', height: '297mm',
        border: 'none', zIndex: '-9999', opacity: '0', pointerEvents: 'none', background: 'white'
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html.replace(/window\.print\(\);/g, ''));
    doc.close();

    iframe.onload = () => {
        setTimeout(() => {
            const body = doc.body;
            const contentHeight = Math.max(body.scrollHeight, body.offsetHeight, doc.documentElement.scrollHeight);
            iframe.style.height = (contentHeight + 100) + 'px';

            const opt = {
                margin: [25, 0, 25, 0],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollY: 0, window: iframe.contentWindow as Window, background: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            // @ts-ignore
            html2pdf().set(opt).from(doc.documentElement).toPdf().get('pdf').then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(9);
                    pdf.setTextColor(150);
                    pdf.text('PÁGINA ' + i + ' DE ' + totalPages, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 15, { align: 'center' });
                }
                pdf.save(filename);
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }).catch((err: any) => {
                console.error("PDF Error:", err);
                notify("Erro ao gerar PDF.", "error");
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            });
        }, 1500);
    };
};
