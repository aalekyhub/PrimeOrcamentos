// No longer using html2pdf here
import { ServiceOrder, CompanyProfile } from '../types';
import { escapeHtml, toNumber, formatMoney, valorPorExtenso } from './formatUtils';

// Styles are now handled by the unified ReportPreview component.

// Cabeçalho e caixas de CONTRATANTE/CONTRATADA compartilhados entre os
// modelos de contrato, para os dois manterem exatamente o mesmo layout.
const buildContractHeaderHtml = (
  order: ServiceOrder,
  customer: any,
  company: CompanyProfile,
  subtitle: string,
  contractLabel: string
) => `
  <div class="report-header" style="padding-bottom:18px; border-bottom:2px solid #e2e8f0; margin-bottom:18px;">
      <table style="width:100%; border-collapse:collapse; table-layout: fixed;">
          <tr>
              <td style="width:72%; vertical-align:top; padding:0;">
                  <table style="width:100%; border-collapse:collapse;">
                      <tr>
                          ${company.logo ? `
                          <td style="width:90px; vertical-align:middle; padding:0 14px 0 0;">
                              <img src="${company.logo}" style="height: ${company.logoSize || 70}px; max-width: 250px; object-fit: contain;" crossorigin="anonymous">
                          </td>
                          ` : ''}
                          <td style="vertical-align:middle; padding:0;">
                              <h1 style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1.2; margin: 0 0 3px 0; text-transform: uppercase;">
                                  ${escapeHtml(company.name)}
                              </h1>
                              <p style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
                                  ${subtitle}
                              </p>
                              <p style="font-size: 9px; color: #000; font-weight: 700; line-height: 1.2;">
                                  ${escapeHtml(company.cnpj || "")}${company.cnpj && company.phone ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${escapeHtml(company.phone || "")}
                              </p>
                              ${company.address ? `
                              <p style="margin: 1px 0 0 0; font-size: 8.5px; color: #000; font-weight: 600; text-transform: uppercase;">
                                  ${escapeHtml(company.address)}
                              </p>
                              ` : ''}
                          </td>
                      </tr>
                  </table>
              </td>
              <td style="width:28%; vertical-align:top; text-align:right; padding:0;">
                  <h2 style="font-size: 17px; font-weight: 900; color: #2563eb; margin: 0; letter-spacing: -0.5px; line-height: 1.1;">
                      ${contractLabel}
                  </h2>
                  <p style="font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase; margin-top: 6px;">
                      EMISSÃO: ${new Date().toLocaleDateString("pt-BR")}
                  </p>
              </td>
          </tr>
      </table>
  </div>

  <!-- Info Boxes -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 15px;">
    <div style="background:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #dbeafe;">
      <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATADA</h4>
      <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${escapeHtml(company.name)}</p>
      <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">CNPJ: ${escapeHtml(company.cnpj || "")}</p>
      <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${escapeHtml(company.address || "")}</p>
    </div>
    <div style="background:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #dbeafe;">
      <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATANTE</h4>
      <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${escapeHtml(customer.name)}</p>
      <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${(customer.document || "").replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: ${escapeHtml(customer.document || "N/A")}</p>
      <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${escapeHtml(customer.address || "")}, ${escapeHtml(customer.number || "")} - ${escapeHtml(customer.city || "")}</p>
    </div>
  </div>
`;

export const getContractHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
  const contractValue = order.contractPrice && order.contractPrice > 0
    ? order.contractPrice
    : order.totalAmount;

  return `
    <div class="pdf-page-content">
      <div style="width:100%; background:#ffffff; font-family:Inter, Arial, sans-serif; color:#1e293b; padding:0;">
        ${buildContractHeaderHtml(order, customer, company, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS', order.id.replace('OS-', 'CONTRATO-'))}

        <!-- Introduction -->
        <div style="margin-bottom: 4mm;">
          <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">
            As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:
          </p>
        </div>

        <!-- CLÁUSULA 1 -->
        <div style="margin-bottom: 3.5mm;">
          <div style="break-inside: avoid; page-break-inside: avoid;">
            <h4 style="font-size:16px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px 0; padding-top: 3mm;">CLÁUSULA 1ª – DO OBJETO</h4>
            <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 10px 0;">
              1.1. O presente contrato tem por objeto a execução de reforma na unidade situada no endereço do CONTRATANTE, compreendendo os serviços descritos em memorial descritivo e/ou proposta comercial anexa, que passa a integrar este instrumento para todos os fins legais.
            </p>
          </div>

          <div style="background:#f8fafc; padding: 15px; border-radius: 8px; border-left: 5px solid #2563eb; margin: 15px 0; break-inside: avoid; page-break-inside: avoid;">
            <p style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin:0;">${escapeHtml((order.description || "").toUpperCase())}</p>
            ${order.osType === 'EQUIPMENT' && order.items && order.items.length > 0 ? `<p style="font-size:12px; color:#1e3a8a; margin-top:4px;">${order.items.map((i: any) => `${toNumber(i.quantity)}x ${escapeHtml(i.description)}`).join(', ')}</p>` : ''}
          </div>

          <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:10px 0 0 0;">1.2. A contratação se dá sob regime de empreitada global, com fornecimento de materiais e mão de obra, assumindo a CONTRATADA integral responsabilidade técnica, administrativa e operacional pela execução da obra.</p>
          <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:10px 0 0 0;">1.3. Não se caracteriza, em hipótese alguma, cessão ou locação de mão de obra.</p>
        </div>

        <!-- CLÁUSULA 2 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.2. Não haverá subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">2.3. A CONTRATADA assume integral responsabilidade pela obra e pelos profissionais por ela contratados.</p>
        </div>

        <!-- CLÁUSULA 3 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 3ª – DO PREÇO E FORMA DE PAGAMENTO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b style="color:#0f172a;">R$ ${formatMoney(contractValue)} (${valorPorExtenso(contractValue)})</b>.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">3.2. O pagamento será realizado da seguinte forma: <b>${escapeHtml(order.paymentTerms || 'Conforme combinado')}</b>.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">3.3. Os pagamentos deverão ser feitos via Pix chave <b>CNPJ (${escapeHtml(company.cnpj || '57.886.036/0001-31')})</b>.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">3.4. O valor contratado corresponde a preço fechado por obra certa, não estando vinculado a horas trabalhadas ou número de funcionários.</p>
        </div>

        <!-- CLÁUSULA 4 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 3mm 0 2mm 0;">4.1. Executar os serviços conforme escopo contratado e normas técnicas aplicáveis.</p>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 2mm 0 2mm 0;">4.2. Responsabilizar-se por seus empregados quanto a encargos trabalhistas, previdenciários e fiscais.</p>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 2mm 0 2mm 0;">4.3. Manter regularidade fiscal durante a execução do contrato.</p>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 2mm 0 0 0;">4.4. Responder por danos causados ao imóvel decorrentes de culpa comprovada.</p>
            </div>
        </div>

        <!-- CLÁUSULA 5 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 3mm 0 2mm 0;">5.1. Garantir acesso ao local da obra.</p>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 2mm 0 2mm 0;">5.2. Efetuar os pagamentos conforme pactuado.</p>
              <p style="font-size:14px; color:#475569; line-height:1.6; margin: 2mm 0 0 0;">5.3. Providenciar autorizações condominiais, quando exigidas.</p>
            </div>
        </div>

        <!-- CLÁUSULA 6 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">6.1. O presente contrato caracteriza empreitada total, nos termos da legislação previdenciária vigente, especialmente Lei nº 8.212/91 e IN RFB 2110/2022.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">6.2. Não se aplica retenção de 11% de INSS, por não se tratar de cessão de mão de obra.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">6.3. A CONTRATADA é responsável pelo recolhimento de tributos incidentes sobre suas atividades.</p>
        </div>

        <!-- CLÁUSULA 7 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 7ª – DO PRAZO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">7.1. O prazo estimado para execução da obra é de <b>${escapeHtml(order.deliveryTime || '15 dias úteis')}</b>, contados do início efetivo dos serviços.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">7.2. O prazo poderá ser prorrogado em caso de: serviços adicionais, atraso de pagamento, impedimento de acesso, ou caso fortuito/força maior.</p>
        </div>

        <!-- CLÁUSULA 8 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">8.1. Quando exigido pela natureza dos serviços, será providenciada ART ou RRT por profissional habilitado.</p>
            </div>
        </div>

        <!-- CLÁUSULA 9 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 9ª – DOS SERVIÇOS ADICIONAIS</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">9.1. Qualquer serviço não previsto no escopo original será considerado extra e dependerá de orçamento complementar e aprovação formal do CONTRATANTE.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">9.2. A execução de serviços adicionais implicará ajuste de prazo e valor mediante termo aditivo.</p>
        </div>

        <!-- CLÁUSULA 10 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 10ª – DA MULTA E INADIMPLEMENTO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">10.1. O atraso no pagamento implicará multa de 2% sobre o valor devido, juros de 1% ao mês e correção monetária pelo índice oficial vigente.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">10.2. Em caso de rescisão imotivada por parte do CONTRATANTE, será devida multa equivalente a 10% do valor restante do contrato.</p>
        </div>

        <!-- CLÁUSULA 11 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 11ª – DA RESCISÃO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">11.1. O contrato poderá ser rescindido por descumprimento contratual mediante notificação escrita.</p>
            </div>
        </div>

        <!-- CLÁUSULA 12 -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 12ª – DO FORO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">12.1. Fica eleito o foro da Comarca de <b>${escapeHtml(customer.city || 'Brasília')} - ${escapeHtml(customer.state || 'DF')}</b> para dirimir quaisquer controvérsias oriundas deste contrato.</p>
            </div>
        </div>

        <div style="margin-top: 10mm; font-size: 14px; color: #475569; line-height: 1.6;">
            <p>E por estarem justas e contratadas, assinam as partes o presente instrumento em duas vias de igual teor.</p>
            <p style="margin-top: 5mm;">${escapeHtml(customer.city || 'Brasília')}/${escapeHtml(customer.state || 'DF')}, ${new Date().getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())} de ${new Date().getFullYear()}.</p>
        </div>

        <div style="margin: 30mm 0 20mm 0; page-break-inside: avoid;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16mm; padding: 0 10mm;">
                <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                    <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATADA</p>
                    <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${escapeHtml(company.name)}</p>
                </div>
                <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                    <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATANTE</p>
                    <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${escapeHtml(customer.name)}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  `;
};

// Helper para renderizar uma lista de sub-itens com letras (a, b, c...),
// usada nas cláusulas de obrigações e penalidades do contrato de manutenção.
const letteredList = (items: string[]) => `
  <div style="margin: 2mm 0 2mm 6mm;">
    ${items.map(text => `<p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:1mm 0;">${text}</p>`).join('')}
  </div>
`;

export const getMaintenanceContractHtml = (order: ServiceOrder, customer: any, company: CompanyProfile) => {
  const contractValue = order.contractPrice && order.contractPrice > 0
    ? order.contractPrice
    : order.totalAmount;

  const contractLabel = order.id.replace('OS-', 'CONTRATO-').replace('ORC-', 'CONTRATO-');
  const scopeDescription = (order.description || 'MANUTENÇÃO PREVENTIVA, PREDITIVA E CORRETIVA').toUpperCase();

  return `
    <div class="pdf-page-content">
      <div style="width:100%; background:#ffffff; font-family:Inter, Arial, sans-serif; color:#1e293b; padding:0;">
        ${buildContractHeaderHtml(order, customer, company, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO', contractLabel)}

        <!-- Introduction -->
        <div style="margin-bottom: 4mm;">
          <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">
            As partes acima identificadas têm entre si justo e contratado o presente Contrato de Prestação de Serviços de Manutenção, com fornecimento de mão de obra, sem fornecimento de materiais de consumo e aplicação, salvo quando expressamente acordado entre as partes, que será regido pelas cláusulas e condições seguintes:
          </p>
        </div>

        <!-- CLÁUSULA PRIMEIRA -->
        <div style="margin-bottom: 3.5mm;">
          <div style="break-inside: avoid; page-break-inside: avoid;">
            <h4 style="font-size:16px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px 0; padding-top: 3mm;">CLÁUSULA PRIMEIRA – DO OBJETO</h4>
            <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 10px 0;">
              1.1. O presente contrato tem por objeto a prestação de serviços de manutenção preventiva, preditiva e corretiva descritos na proposta comercial aprovada pelo CONTRATANTE, que passa a integrar este instrumento para todos os fins, compreendendo o fornecimento da mão de obra necessária à execução dos serviços, sem fornecimento de materiais de consumo, peças ou componentes de aplicação, salvo quando expressamente acordado entre as partes.
            </p>
          </div>

          <div style="background:#f8fafc; padding: 15px; border-radius: 8px; border-left: 5px solid #2563eb; margin: 15px 0; break-inside: avoid; page-break-inside: avoid;">
            <p style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin:0;">${escapeHtml(scopeDescription)}</p>
            ${order.items && order.items.length > 0 ? `<p style="font-size:12px; color:#1e3a8a; margin-top:4px;">${order.items.map((i: any) => `${toNumber(i.quantity)}x ${escapeHtml(i.description)}`).join(', ')}</p>` : ''}
          </div>
        </div>

        <!-- CLÁUSULA SEGUNDA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA SEGUNDA – DOS SERVIÇOS</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">2.1. A proposta comercial aprovada pelo CONTRATANTE, contendo a descrição dos serviços a serem executados, passa a integrar o presente contrato para todos os fins, desde que suas disposições não contrariem as cláusulas deste instrumento.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.2. Os equipamentos que eventualmente forem desativados, substituídos ou retirados de operação durante a vigência deste contrato deixarão de integrar o escopo dos serviços. Eventuais intervenções necessárias à sua reativação somente serão executadas mediante apresentação e aprovação prévia de proposta comercial específica.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.3. Para a execução dos serviços previstos na Cláusula Primeira, o CONTRATANTE deverá permitir e facilitar o acesso da equipe técnica da CONTRATADA às instalações e aos equipamentos abrangidos pelo contrato, possibilitando a realização das inspeções, visitas técnicas e manutenções preventivas e corretivas necessárias.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.4. A CONTRATADA deverá disponibilizar profissionais devidamente capacitados e qualificados para a execução dos serviços, observando as normas técnicas, operacionais e de segurança aplicáveis às atividades contratadas.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.5. O CONTRATANTE poderá solicitar, mediante justificativa, a substituição de qualquer profissional da CONTRATADA cuja conduta, desempenho ou qualificação técnica se mostre incompatível com as atividades a serem executadas.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.6. A CONTRATADA poderá substituir seus profissionais sempre que necessário, desde que os substitutos possuam qualificação compatível com as funções desempenhadas e sejam devidamente identificados perante o CONTRATANTE.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.7. A CONTRATADA deverá observar, no momento da admissão e durante a permanência de seus profissionais nas dependências do CONTRATANTE, as condições de aptidão, identificação, apresentação pessoal e demais requisitos necessários ao exercício das respectivas funções.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.8. O CONTRATANTE poderá solicitar, mediante justificativa, o afastamento de profissional da CONTRATADA cuja permanência seja considerada inadequada em razão de conduta incompatível, descumprimento das normas internas ou outro motivo devidamente fundamentado.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.9. O retorno de profissional anteriormente afastado das dependências do CONTRATANTE para execução dos serviços dependerá de autorização prévia do CONTRATANTE.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.10. A substituição de profissionais em razão de férias, licenças, afastamentos ou outros impedimentos deverá ocorrer de modo a não prejudicar a continuidade dos serviços.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.11. Na execução dos serviços, a CONTRATADA deverá observar as normas técnicas vigentes, as normas de segurança aplicáveis e as determinações administrativas do CONTRATANTE, desde que compatíveis com o objeto deste contrato.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.12. O CONTRATANTE poderá solicitar a execução de serviços extraordinários não compreendidos no objeto deste contrato, mediante orçamento específico e autorização prévia e formal.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.13. A CONTRATADA manterá profissional encarregado ou responsável pela coordenação dos serviços, competindo-lhe:</p>
            ${letteredList([
              'a) coordenar os serviços;',
              'b) acompanhar e fiscalizar o seu adequado andamento;',
              'c) orientar os profissionais quanto à disciplina, assiduidade, pontualidade e apresentação pessoal;',
              'd) manter contato com o representante do CONTRATANTE;',
              'e) acompanhar e conferir os serviços executados;',
              'f) controlar os registros administrativos de sua equipe; e',
              'g) adotar as providências necessárias para solucionar falhas ou irregularidades constatadas.'
            ])}
        </div>

        <!-- CLÁUSULA TERCEIRA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">3.1. Constituem obrigações do CONTRATANTE:</p>
            </div>
            ${letteredList([
              '3.1.1. Promover, por meio de seu representante, o acompanhamento e a fiscalização dos serviços, sob os aspectos quantitativos e qualitativos, anotando em registro próprio as falhas detectadas e comunicando à CONTRATADA as ocorrências que exijam correção.',
              '3.1.2. Manter o relacionamento contratual com a CONTRATADA exclusivamente por intermédio da pessoa ou representante por ele credenciado.',
              '3.1.3. Efetuar pontualmente os pagamentos devidos à CONTRATADA, após o cumprimento das formalidades legais e contratuais.',
              '3.1.4. Proporcionar os meios e as condições necessárias de segurança e higiene aos empregados da CONTRATADA, nas dependências que estejam sob responsabilidade do CONTRATANTE, para a adequada execução dos serviços.',
              '3.1.5. Fiscalizar o cumprimento das obrigações assumidas pela CONTRATADA, inclusive quanto à continuidade da prestação dos serviços necessários aos custos e à programação contratados.',
              '3.1.6. Permitir o livre acesso dos profissionais da CONTRATADA, devidamente identificados, às áreas necessárias à execução dos serviços.',
              '3.1.7. Prestar as informações e os esclarecimentos solicitados pela CONTRATADA e necessários à correta execução dos serviços.',
              '3.1.8. Fornecer à CONTRATADA, quando existentes e disponíveis, projetos, memoriais descritivos, manuais e demais documentos referentes às instalações e aos equipamentos objeto deste contrato.',
              '3.1.9. Fornecer os materiais de aplicação e consumo necessários à realização dos serviços, conforme a demanda apresentada pela CONTRATADA, dentro dos prazos definidos em conjunto.',
              '3.1.10. Cumprir e fazer cumprir as demais disposições previstas neste contrato.'
            ])}
        </div>

        <!-- CLÁUSULA QUARTA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA CONTRATADA</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">4.1. Constituem obrigações da CONTRATADA:</p>
            </div>
            ${letteredList([
              '4.1.1. Responsabilizar-se integralmente pela execução dos serviços contratados, nos termos da legislação vigente, bem como por todas as despesas inerentes à sua execução, inclusive encargos sociais, trabalhistas, previdenciários, fiscais e comerciais relativos aos seus empregados.',
              '4.1.2. Selecionar e preparar adequadamente os profissionais que prestarão os serviços, encaminhando ao CONTRATANTE somente pessoas devidamente capacitadas, identificadas e aptas ao exercício das respectivas funções.',
              '4.1.3. Manter disciplina durante a execução dos serviços e retirar, no prazo máximo de 24 (vinte e quatro) horas após notificação do CONTRATANTE, qualquer profissional cuja conduta seja considerada incompatível com as normas estabelecidas.',
              '4.1.4. Manter seus profissionais devidamente identificados, inclusive por meio de crachá quando exigido, e fornecer uniformes e equipamentos de proteção individual – EPIs necessários à execução segura dos serviços.',
              '4.1.5. Indicar representante ou encarregado para manter contato com o CONTRATANTE, fornecendo nome e telefone para comunicação durante a execução dos serviços. O representante deverá informar ocorrências relevantes e prestar os esclarecimentos solicitados.',
              '4.1.6. Responsabilizar-se pelo cumprimento, por parte de seus empregados e prepostos, das normas disciplinares estabelecidas pelo CONTRATANTE, desde que previamente comunicadas e compatíveis com a legislação.',
              '4.1.7. Registrar e controlar a assiduidade e a pontualidade de seus profissionais, de acordo com a programação dos serviços.',
              '4.1.8. Apresentar ao CONTRATANTE, quando legalmente exigível e relacionado aos profissionais alocados na execução deste contrato, documentação comprobatória do cumprimento das obrigações trabalhistas, previdenciárias e fundiárias pertinentes.',
              '4.1.9. Manter, durante a execução do contrato, todas as condições de habilitação, regularidade e qualificação necessárias à prestação dos serviços.',
              '4.1.10. Não caucionar, ceder ou utilizar este contrato como garantia de operação financeira sem autorização prévia e expressa do CONTRATANTE.',
              '4.1.11. Responsabilizar-se pelos danos comprovadamente causados ao patrimônio do CONTRATANTE ou de terceiros por ação ou omissão, dolo ou culpa, de seus empregados ou prepostos durante a execução dos serviços, obrigando-se ao correspondente ressarcimento quando comprovada sua responsabilidade.',
              '4.1.12. Responder pelos danos pessoais ou materiais decorrentes diretamente de seus atos ou dos atos de seus empregados ou prepostos durante a execução dos serviços, observados o nexo causal e a responsabilidade legal aplicável.',
              '4.1.13. Implantar, após a assinatura do contrato e dentro do prazo necessário à mobilização dos serviços, as normas, procedimentos e controles indispensáveis à correta execução das atividades.',
              '4.1.14. Não repassar aos seus empregados custos relativos a uniformes ou equipamentos de proteção individual necessários à execução dos serviços, quando tais itens forem de responsabilidade da CONTRATADA.',
              '4.1.15. Manter quantitativo de profissionais compatível com as necessidades dos serviços contratados, realizando substituições quando necessárias para assegurar sua continuidade.',
              '4.1.16. Informar imediatamente ao CONTRATANTE qualquer irregularidade constatada durante a execução dos serviços.',
              '4.1.17. Comunicar por escrito ao CONTRATANTE qualquer anormalidade de caráter urgente e prestar os esclarecimentos necessários.',
              '4.1.18. Providenciar a substituição de profissional cuja ausência possa comprometer a continuidade dos serviços, sempre que necessário.',
              '4.1.19. Corrigir, dentro de prazo razoável e compatível com a natureza da ocorrência, eventuais falhas decorrentes dos serviços executados pela própria CONTRATADA.',
              '4.1.20. Alocar seus profissionais nos postos, locais ou atividades necessários ao cumprimento do objeto contratado, de acordo com a programação dos serviços.',
              '4.1.21. Fornecer uniformes aos seus profissionais quando exigidos para a execução das atividades, observadas as normas trabalhistas aplicáveis.',
              '4.1.22. Solicitar ao CONTRATANTE, com antecedência razoável, os materiais de aplicação e consumo necessários à execução das manutenções programadas quando, conforme este contrato, o fornecimento desses materiais for de responsabilidade do CONTRATANTE.'
            ])}
        </div>

        <!-- CLÁUSULA QUINTA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA QUINTA – DAS OBRIGAÇÕES SOCIAIS, COMERCIAIS E FISCAIS</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">5.1. A CONTRATADA, relativamente às obrigações sociais, comerciais, fiscais, trabalhistas e previdenciárias relacionadas à execução deste contrato e sem prejuízo das demais obrigações estabelecidas na legislação, obriga-se a:</p>
            </div>
            ${letteredList([
              '5.1.1. Assumir integral responsabilidade pelos encargos previdenciários e pelas obrigações sociais previstas na legislação social e trabalhista em vigor, relativas aos seus empregados, prepostos ou profissionais vinculados à execução dos serviços.',
              '5.1.2. Assumir responsabilidade pelas providências e obrigações previstas na legislação específica relativas a acidentes de trabalho envolvendo seus empregados ou prepostos durante a execução dos serviços, inclusive quando ocorridos nas dependências do CONTRATANTE.',
              '5.1.3. Assumir todos os encargos de eventual demanda trabalhista, cível, administrativa ou penal relacionada aos seus empregados, prepostos ou à execução dos serviços, quando decorrente de ato ou fato imputável à CONTRATADA.',
              '5.1.4. Assumir integral responsabilidade pelos encargos fiscais e comerciais resultantes da execução deste contrato, naquilo que lhe competir legalmente.'
            ])}
        </div>

        <!-- CLÁUSULA SEXTA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA SEXTA – DA NÃO TRANSFERÊNCIA DE ENCARGOS</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">6.1. A eventual inadimplência da CONTRATADA quanto aos encargos trabalhistas, previdenciários, fiscais ou comerciais de sua responsabilidade não transfere automaticamente tais obrigações ao CONTRATANTE, observadas as responsabilidades que possam decorrer diretamente da legislação ou de decisão judicial.</p>
            </div>
        </div>

        <!-- CLÁUSULA SÉTIMA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA SÉTIMA – DO PREÇO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">7.1. O valor mensal devido pelo CONTRATANTE à CONTRATADA, para cobertura das despesas decorrentes da execução dos serviços objeto deste contrato, incluindo tributos e demais custos previstos, será de <b style="color:#0f172a;">R$ ${formatMoney(contractValue)} (${valorPorExtenso(contractValue)})</b> mensais.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">7.2. O valor estabelecido nesta cláusula corresponde exclusivamente ao escopo definido neste contrato e na proposta comercial que o integra.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">7.3. Serviços extraordinários, peças, materiais, componentes e equipamentos não incluídos no escopo serão objeto de orçamento específico e somente poderão ser cobrados após aprovação do CONTRATANTE.</p>
        </div>

        <!-- CLÁUSULA OITAVA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA OITAVA – DA ALTERAÇÃO DO VALOR DO CONTRATO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">8.1. O valor contratado poderá ser reajustado nas datas-base das categorias profissionais envolvidas na execução dos serviços ou após o período legalmente permitido para reajuste, mediante negociação e formalização entre as partes.</p>
            </div>
        </div>

        <!-- CLÁUSULA NONA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA NONA – DA REPACTUAÇÃO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">9.1. O preço previsto na Cláusula Sétima poderá ser repactuado mediante negociação entre as partes, desde que a CONTRATADA apresente solicitação devidamente fundamentada e acompanhada de documentação que demonstre a variação efetiva dos componentes de custo relacionados à execução do contrato.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">9.2. Para fins de repactuação relacionada à mão de obra, poderá ser considerada como referência a data de vigência do acordo, convenção ou dissídio coletivo aplicável à categoria profissional envolvida.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">9.3. Poderão ser considerados, para fins de repactuação, os componentes de custo que tenham sofrido variação efetivamente demonstrada e que possuam relação direta com a execução dos serviços.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">9.4. Não será admitida a inclusão, por ocasião da repactuação, de item de custo inexistente ou não previsto originalmente, salvo quando decorrer de obrigação legal, normativa ou convencional superveniente.</p>
        </div>

        <!-- CLÁUSULA DÉCIMA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA DÉCIMA – DA VIGÊNCIA</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">10.1. O presente contrato terá vigência de 12 (doze) meses, contados da data de sua assinatura, podendo ser renovado mediante acordo entre as partes e formalização por escrito.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">10.2. A renovação do contrato poderá ser condicionada à avaliação da qualidade dos serviços prestados, à manutenção das condições técnicas e comerciais e à inexistência de fatos que desaconselhem sua continuidade.</p>
        </div>

        <!-- CLÁUSULA DÉCIMA PRIMEIRA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA DÉCIMA PRIMEIRA – DO PAGAMENTO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">11.1. O pagamento dos serviços objeto deste contrato será efetuado até o 10º (décimo) dia corrido do mês subsequente ao da prestação dos serviços, mediante apresentação da respectiva Nota Fiscal, acompanhada da documentação contratualmente exigida.</p>
            </div>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.2. Para efeito de pagamento, a CONTRATADA deverá apresentar o documento de cobrança emitido a partir do primeiro dia útil de cada mês, referente aos serviços prestados no mês imediatamente anterior.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.3. O pagamento ficará condicionado à apresentação correta da documentação necessária e ao aceite dos serviços pelo representante responsável do CONTRATANTE.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.4. O CONTRATANTE poderá efetuar diretamente aos empregados da CONTRATADA, quando autorizado ou exigido pela legislação ou por determinação judicial, valores correspondentes a obrigações trabalhistas não adimplidas, procedendo aos respectivos abatimentos dos créditos da CONTRATADA, quando juridicamente cabível.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.5. Quando exigível e relacionado à mão de obra alocada neste contrato, a CONTRATADA deverá apresentar, juntamente com o documento de cobrança, documentação comprobatória das obrigações trabalhistas e previdenciárias pertinentes ao período faturado.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.6. O CONTRATANTE efetuará as retenções tributárias previstas na legislação vigente, quando aplicáveis.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.7. Caso os serviços contratados não tenham sido prestados integralmente durante determinado período de cobrança por fato imputável à CONTRATADA, o faturamento poderá ser realizado proporcionalmente aos serviços efetivamente prestados.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.8. Serviços executados e previamente autorizados que, por qualquer motivo, não tenham sido faturados na época própria poderão ser incluídos em faturamento posterior, desde que devidamente comprovados e observados os prazos legais aplicáveis.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.9. Caso o documento de cobrança seja apresentado em desacordo com este contrato ou com as exigências legais aplicáveis, o CONTRATANTE comunicará a CONTRATADA para que efetue a correção necessária.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.10. Após a apresentação do documento de cobrança devidamente corrigido, quando necessária a correção prevista no item anterior, o prazo para pagamento será contado novamente a partir do seu recebimento regular.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.11. O atraso no pagamento por motivo comprovadamente decorrente de circunstância prevista neste contrato não caracterizará mora do CONTRATANTE durante o período necessário à regularização da pendência.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">11.12. Por ocasião de cada pagamento, a CONTRATADA deverá apresentar, quando legalmente exigíveis, as certidões ou documentos de regularidade necessários à execução contratual.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">11.13. O CONTRATANTE poderá reter ou compensar valores devidos à CONTRATADA exclusivamente nas hipóteses legalmente permitidas ou expressamente previstas neste contrato, inclusive para ressarcimento de prejuízos comprovados e atribuíveis à CONTRATADA.</p>
        </div>

        <!-- CLÁUSULA DÉCIMA SEGUNDA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA DÉCIMA SEGUNDA – DAS PENALIDADES E RECURSOS ADMINISTRATIVOS</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">12.1. Em caso de inexecução total ou parcial, execução inadequada, atraso injustificado ou descumprimento de obrigação contratual, o CONTRATANTE poderá aplicar à CONTRATADA, observada a gravidade da ocorrência e assegurado o direito de manifestação, as seguintes penalidades:</p>
            </div>
            ${letteredList([
              'a) advertência;',
              'b) multa de até 2% (dois por cento) sobre o valor global do contrato, quando cabível e proporcional à gravidade da infração.'
            ])}
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">12.2. A aplicação de uma penalidade não impedirá a adoção de outras medidas previstas neste contrato ou na legislação, quando cabíveis e proporcionais à ocorrência.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">12.3. Eventual multa regularmente aplicada será formalmente comunicada à CONTRATADA e poderá ser cobrada ou compensada com créditos existentes, observada a legislação.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">12.4. A aplicação de multa não impede que o CONTRATANTE rescinda o contrato quando a gravidade da infração justificar a medida, sem prejuízo da apuração de perdas e danos efetivamente comprovados.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">12.5. As penalidades poderão ser aplicadas isolada ou cumulativamente, quando juridicamente cabível, assegurando-se à CONTRATADA o direito de apresentar manifestação ou defesa.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">12.6. As penalidades previstas nesta cláusula poderão ser afastadas quando o descumprimento decorrer de caso fortuito, força maior ou circunstância comprovadamente alheia à responsabilidade da CONTRATADA.</p>
        </div>

        <!-- CLÁUSULA DÉCIMA TERCEIRA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA DÉCIMA TERCEIRA – DA RESCISÃO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">13.1. Sem prejuízo das demais hipóteses previstas em lei, constituem motivos para rescisão do presente contrato:</p>
            </div>
            ${letteredList([
              'a) o descumprimento ou cumprimento irregular das cláusulas contratuais;',
              'b) atraso injustificado no início ou na continuidade dos serviços;',
              'c) cometimento reiterado de falhas na execução dos serviços;',
              'd) decretação de falência, dissolução ou situação de insolvência que comprometa a execução do contrato;',
              'e) alteração societária ou modificação da finalidade ou estrutura da CONTRATADA que prejudique ou impossibilite a execução do objeto contratual;',
              'f) razões de interesse das partes devidamente formalizadas.'
            ])}
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">13.2. A rescisão poderá ocorrer:</p>
            ${letteredList([
              'a) mediante ato unilateral e escrito do CONTRATANTE, quando houver descumprimento contratual grave imputável à CONTRATADA, observadas as garantias previstas neste instrumento e na legislação aplicável;',
              'b) por acordo entre as partes; ou',
              'c) por iniciativa de qualquer das partes, sem necessidade de apresentação de justa causa, mediante comunicação prévia por escrito com antecedência mínima de 30 (trinta) dias, sem prejuízo do pagamento dos serviços efetivamente prestados até a data do encerramento.'
            ])}
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">13.3. Na hipótese de rescisão decorrente de culpa comprovada da CONTRATADA, esta responderá pelos prejuízos diretamente decorrentes de sua conduta, desde que devidamente demonstrados.</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">13.4. O CONTRATANTE poderá reter valores estritamente necessários à quitação de obrigações comprovadamente de responsabilidade da CONTRATADA, desde que exista fundamento contratual ou legal para a retenção.</p>
        </div>

        <!-- CLÁUSULA DÉCIMA QUARTA -->
        <div style="margin-bottom: 3.5mm;">
            <div style="break-inside: avoid; page-break-inside: avoid;">
              <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA DÉCIMA QUARTA – DO FORO</h4>
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">14.1. Para dirimir quaisquer dúvidas ou controvérsias decorrentes deste contrato, fica eleito o foro de Brasília – Distrito Federal, ressalvadas as hipóteses de competência legal obrigatória.</p>
            </div>
        </div>

        <div style="margin-top: 10mm; font-size: 14px; color: #475569; line-height: 1.6;">
            <p>E, por estarem justas e contratadas, as partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma, para que produza todos os seus efeitos legais.</p>
            <p style="margin-top: 5mm;">Brasília – DF, ${new Date().getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())} de ${new Date().getFullYear()}.</p>
        </div>

        <div style="margin: 30mm 0 20mm 0; page-break-inside: avoid;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16mm; padding: 0 10mm;">
                <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                    <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATADA</p>
                    <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${escapeHtml(company.name)}</p>
                </div>
                <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                    <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATANTE</p>
                    <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${escapeHtml(customer.name)}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  `;
};