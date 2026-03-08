import html2pdf from 'html2pdf.js';
import { ServiceOrder, CompanyProfile } from '../types';

export const getContractStyles = () => `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            background: white; 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
        }
        .a4-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 0 15mm !important; background: white; }
        p, h1, h2, h3, h4, h5, h6 { margin: 0; }
        ul { list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; }
        li { margin-bottom: 4px; }
        .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
        
        @media print {
            @page { size: A4; margin: 10mm 0 15mm 0; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; }
            .a4-container { width: 210mm !important; margin: 0 auto !important; padding: 0 15mm !important; }
        }
    </style>
`;

export const getContractHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
    // Determine the contract value
    const contractValue = order.contractPrice && order.contractPrice > 0
        ? order.contractPrice
        : order.totalAmount;

    return `
    <div id="contract-content" style="background:#fff; padding: 0; margin: 0;">
      <div class="a4-container">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0;">
          <div style="display: flex; align-items: center; justify-content: flex-start;">
            ${company.logo ? `<img src="${company.logo}" style="height: ${company.logoSize || 70}px; max-width: 250px; object-fit: contain;" crossorigin="anonymous" />` : ''}
          </div>
          <div style="text-align: center; flex-grow: 1;">
            <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; text-transform: uppercase;">${company.name}</h1>
            <p style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</p>
            <p style="font-size: 9px; color: #64748b; font-weight: 600;">${company.cnpj || ""} | ${company.phone || ""}</p>
          </div>
          <div style="text-align: right; width: 120px;">
            <h2 style="font-size: 24px; font-weight: 900; color: #2563eb; margin: 0; letter-spacing: -1px;">${order.id.replace('OS-', 'OS')}</h2>
            <p style="font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; margin-top: 2px;">EMISSÃO: ${new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        <!-- Info Boxes -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 15px;">
          <div style="background:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #dbeafe;">
            <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATADA</h4>
            <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${company.name}</p>
            <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${company.address || ""}</p>
            <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${company.email || ""}</p>
          </div>
          <div style="background:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #dbeafe;">
            <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATANTE</h4>
            <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${customer.name}</p>
            <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${(customer.document || "").replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: ${customer.document || "N/A"}</p>
            <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${customer.address || ""}, ${customer.number || ""} - ${customer.city || ""}</p>
          </div>
        </div>

        <!-- Introduction -->
        <div style="margin-bottom: 4mm;">
          <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">
            As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:
          </p>
        </div>

        <!-- Clauses -->
        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
          <h4 style="font-size:16px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px 0; padding-top: 3mm;">CLÁUSULA 1ª – DO OBJETO</h4>
          <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 10px 0;">
            1.1. O presente contrato tem por objeto a execução de reforma na unidade situada no endereço do CONTRATANTE, compreendendo os serviços descritos em memorial descritivo e/ou proposta comercial anexa, que passa a integrar este instrumento para todos os fins legais.
          </p>
          <div style="background:#f8fafc; padding: 15px; border-radius: 8px; border-left: 5px solid #2563eb; margin: 15px 0;">
            <p style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin:0;">${order.description || ""}</p>
            ${order.osType === 'EQUIPMENT' && order.items && order.items.length > 0 ? `<p style="font-size:12px; color:#1e3a8a; margin-top:4px;">${order.items.map((i: any) => `${i.quantity}x ${i.description}`).join(', ')}</p>` : ''}
          </div>
          <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:10px 0 0 0;">1.2. A contratação se dá sob regime de empreitada global, com fornecimento de materiais e mão de obra, assumindo a CONTRATADA integral responsabilidade técnica, administrativa e operacional pela execução da obra.</p>
          <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:10px 0 0 0;">1.3. Não se caracteriza, em hipótese alguma, cessão ou locação de mão de obra.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.2. Não haverá subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">2.3. A CONTRATADA assume integral responsabilidade pela obra e pelos profissionais por ela contratados.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 3ª – DO PREÇO E FORMA DE PAGAMENTO</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b style="color:#0f172a; white-space: nowrap;">R$ ${contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">3.2. O pagamento será realizado da seguinte forma: <b>${order.paymentTerms || 'Conforme combinado'}</b>.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">3.3. O valor contratado corresponde a preço fechado por obra certa, não estando vinculado a horas trabalhadas ou número de funcionários.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
            <ul style="list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; font-size:14px; color:#475569; line-height:1.6;">
                <li>4.1. Executar os serviços conforme escopo contratado e normas técnicas aplicáveis.</li>
                <li>4.2. Responsabilizar-se por seus empregados quanto a encargos trabalhistas, previdenciários e fiscais.</li>
                <li>4.3. Manter regularidade fiscal durante a execução do contrato.</li>
                <li>4.4. Responder por danos causados ao imóvel decorrentes de culpa comprovada.</li>
            </ul>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
            <ul style="list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; font-size:14px; color:#475569; line-height:1.6;">
                <li>5.1. Garantir acesso ao local da obra.</li>
                <li>5.2. Efetuar os pagamentos conforme pactuado.</li>
                <li>5.3. Providenciar autorizações condominiais, quando exigidas.</li>
            </ul>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">6.1. O presente contrato caracteriza empreitada total, nos termos da legislação previdenciária vigente, especialmente Lei nº 8.212/91 e IN RFB 2110/2022.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">6.2. Não se aplica retenção de 11% de INSS, por não se tratar de cessão de mão de obra.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">6.3. A CONTRATADA é responsável pelo recolhimento de tributos incidentes sobre suas atividades.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 7ª – DO PRAZO</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">7.1. O prazo estimado para execução da obra é de <b>${order.deliveryTime || '15 dias úteis'}</b>, contados do início efetivo dos serviços.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">7.2. O prazo poderá ser prorrogado em caso de: serviços adicionais, atraso de pagamento, impedimento de acesso, ou caso fortuito/força maior.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">8.1. Quando exigido pela natureza dos serviços, será providenciada ART ou RRT por profissional habilitado.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 9ª – DOS SERVIÇOS ADICIONAIS</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">9.1. Qualquer serviço não previsto no escopo original será considerado extra e dependerá de orçamento complementar e aprovação formal do CONTRATANTE.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">9.2. A execução de serviços adicionais implicará ajuste de prazo e valor mediante termo aditivo.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 10ª – DA MULTA E INADIMPLEMENTO</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">10.1. O atraso no pagamento implicará multa de 2% sobre o valor devido, juros de 1% ao mês e correção monetária pelo índice oficial vigente.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">10.2. Em caso de rescisão imotivada por parte do CONTRATANTE, será devida multa equivalente a 10% do valor restante do contrato.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 11ª – DA RESCISÃO</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">11.1. O contrato poderá ser rescindido por descumprimento contratual mediante notificação escrita.</p>
        </div>

        <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 12ª – DO FORO</h4>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">12.1. Fica eleito o foro da Comarca de <b>${customer.city || 'Brasília'} - ${customer.state || 'DF'}</b> para dirimir quaisquer controvérsias oriundas deste contrato.</p>
        </div>

        <div style="margin-top: 10mm; font-size: 14px; color: #475569; line-height: 1.6;">
            <p>E por estarem justas e contratadas, assinam as partes o presente instrumento em duas vias de igual teor.</p>
            <p style="margin-top: 5mm;">${customer.city || 'Brasília'}/${customer.state || 'DF'}, ${new Date().getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())} de ${new Date().getFullYear()}.</p>
        </div>

        <div style="margin: 30mm 0 20mm 0; page-break-inside: avoid;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16mm; padding: 0 10mm;">
                <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                    <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATADA</p>
                    <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${company.name}</p>
                </div>
                <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                    <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATANTE</p>
                    <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${customer.name}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  `;
};

export const downloadContractPdf = async (order: ServiceOrder, customer: any, company: CompanyProfile, notify?: (msg: string, type?: string) => void) => {
    const contentHtml = getContractHtml(order, customer, company);

    const opt = {
        margin: [10, 0, 15, 0] as [number, number, number, number],
        filename: `Contrato - ${order.id.replace("OS-", "OS")} - ${order.description || "Proposta"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
            scale: 4,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            letterRendering: true,
            windowWidth: 1200,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"] }
    };

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = contentHtml;
    const style = document.createElement("style");
    style.textContent = `
        ${getContractStyles()}
        .a4-container { width: 210mm !important; }
    `;
    tempDiv.appendChild(style);
    document.body.appendChild(tempDiv);

    try {
        if (notify) notify("Gerando PDF do Contrato...", "success");
        await new Promise(resolve => setTimeout(resolve, 500));
        await (html2pdf()
            .set(opt)
            .from(tempDiv)
            .toPdf()
            .get('pdf')
            .then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(10);
                    pdf.setTextColor(148, 163, 184);
                    pdf.text(
                        `Pág. ${i} / ${totalPages}`,
                        pdf.internal.pageSize.getWidth() - 15,
                        pdf.internal.pageSize.getHeight() - 10,
                        { align: "right" }
                    );
                }
            }) as any)
            .save();
        if (notify) notify("PDF do Contrato gerado com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        if (notify) notify("Erro ao gerar PDF do Contrato. Tente novamente.", "error");
    } finally {
        document.body.removeChild(tempDiv);
    }
};

export const printContractRawHTML = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
    return `
<!DOCTYPE html>
<html>
    <head>
        <title>Contrato - ${order.id.replace('OS-', 'OS')} - ${order.description || 'Proposta'}</title>
        ${getContractStyles()}
    </head>
    <body onload="setTimeout(() => { window.print(); window.close(); }, 800);">
        ${getContractHtml(order, customer, company).replace('crossorigin="anonymous"', '')}
    </body>
</html>`;
};
