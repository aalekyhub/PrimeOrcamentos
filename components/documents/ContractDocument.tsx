import React from 'react';
import { ServiceOrder, CompanyProfile } from '../../types';
import { toNumber, formatMoney } from '../../services/formatUtils';

interface ContractDocumentProps {
    order: ServiceOrder;
    customer: any;
    company: CompanyProfile;
}

export const ContractDocument = React.forwardRef<HTMLDivElement, ContractDocumentProps>(
    ({ order, customer, company }, ref) => {
        const contractValue = order.contractPrice && order.contractPrice > 0
            ? order.contractPrice
            : order.totalAmount;

        return (
            <div ref={ref} className="pdf-page print-description-content">
                {/* Header */}
                <div className="pdf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        {company.logo && (
                            <img src={company.logo} style={{ height: `${company.logoSize || 70}px`, maxWidth: '250px', objectFit: 'contain' }} alt="Logo" />
                        )}
                    </div>
                    <div style={{ textAlign: 'center', flexGrow: 1 }}>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '2px', textTransform: 'uppercase' }}>{company.name}</h1>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</p>
                        <p style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>{company.cnpj || ""} | {company.phone || ""}</p>
                    </div>
                    <div style={{ textAlign: 'right', width: '120px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb', margin: 0, letterSpacing: '-1px' }}>{order.id.replace('OS-', 'OS')}</h2>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginTop: '2px' }}>EMISSÃO: {new Date().toLocaleDateString("pt-BR")}</p>
                    </div>
                </div>

                {/* Info Boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '15px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 2mm 0' }}>CONTRATADA</h4>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>{company.name}</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', margin: '1mm 0 0 0' }}>{company.address || ""}</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', margin: 0 }}>{company.email || ""}</p>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 2mm 0' }}>CONTRATANTE</h4>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>{customer?.name || order.customerName}</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', margin: '1mm 0 0 0' }}>
                            {(customer?.document || "").replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: {customer?.document || "N/A"}
                        </p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', margin: 0 }}>
                            {customer?.address || ""}{customer?.number ? `, ${customer.number}` : ""} - {customer?.city || ""}
                        </p>
                    </div>
                </div>

                {/* Introduction */}
                <div style={{ marginBottom: '4mm' }}>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>
                        As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:
                    </p>
                </div>

                {/* Clauses */}
                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0', paddingTop: '3mm' }}>CLÁUSULA 1ª – DO OBJETO</h4>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 10px 0' }}>
                        1.1. O presente contrato tem por objeto a execução de reforma na unidade situada no endereço do CONTRATANTE, compreendendo os serviços descritos em memorial descritivo e/ou proposta comercial anexa, que passa a integrar este instrumento para todos os fins legais.
                    </p>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #2563eb', margin: '15px 0' }}>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{order.description || ""}</p>
                        {order.osType === 'EQUIPMENT' && order.items && order.items.length > 0 && (
                            <p style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '4px' }}>
                                {order.items.map(i => `${toNumber(i.quantity)}x ${i.description}`).join(', ')}
                            </p>
                        )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '10px 0 0 0' }}>1.2. A contratação se dá sob regime de empreitada global, com fornecimento de materiais e mão de obra, assumindo a CONTRATADA integral responsabilidade técnica, administrativa e operacional pela execução da obra.</p>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '10px 0 0 0' }}>1.3. Não se caracteriza, em hipótese alguma, cessão ou locação de mão de obra.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 2mm 0' }}>2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 2mm 0' }}>2.2. Não haverá subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 0 0' }}>2.3. A CONTRATADA assume integral responsabilidade pela obra e pelos profissionais por ela contratados.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 3ª – DO PREÇO E FORMA DE PAGAMENTO</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 2mm 0' }}>3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>R$ {formatMoney(contractValue)}</b>.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 2mm 0' }}>3.2. O pagamento será realizado da seguinte forma: <b>{order.paymentTerms || 'Conforme combinado'}</b>.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 0 0' }}>3.3. O valor contratado corresponde a preço fechado por obra certa, não estando vinculado a horas trabalhadas ou número de funcionários.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: '3mm 0 0 0', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                        <li style={{ marginBottom: '4px' }}>4.1. Executar os serviços conforme escopo contratado e normas técnicas aplicáveis.</li>
                        <li style={{ marginBottom: '4px' }}>4.2. Responsabilizar-se por seus empregados quanto a encargos trabalhistas, previdenciários e fiscais.</li>
                        <li style={{ marginBottom: '4px' }}>4.3. Manter regularidade fiscal durante a execução do contrato.</li>
                        <li style={{ marginBottom: '4px' }}>4.4. Responder por danos causados ao imóvel decorrentes de culpa comprovada.</li>
                    </ul>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: '3mm 0 0 0', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                        <li style={{ marginBottom: '4px' }}>5.1. Garantir acesso ao local da obra.</li>
                        <li style={{ marginBottom: '4px' }}>5.2. Efetuar os pagamentos conforme pactuado.</li>
                        <li style={{ marginBottom: '4px' }}>5.3. Providenciar autorizações condominiais, quando exigidas.</li>
                    </ul>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 2mm 0' }}>6.1. O presente contrato caracteriza empreitada total, nos termos da legislação previdenciária vigente, especialmente Lei nº 8.212/91 e IN RFB 2110/2022.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 2mm 0' }}>6.2. Não se aplica retenção de 11% de INSS, por não se tratar de cessão de mão de obra.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 0 0' }}>6.3. A CONTRATADA é responsável pelo recolhimento de tributos incidentes sobre suas atividades.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 7ª – DO PRAZO</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 2mm 0' }}>7.1. O prazo estimado para execução da obra é de <b>{order.deliveryTime || '15 dias úteis'}</b>, contados do início efetivo dos serviços.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 0 0' }}>7.2. O prazo poderá ser prorrogado em caso de: serviços adicionais, atraso de pagamento, impedimento de acesso, ou caso fortuito/força maior.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>8.1. Quando exigido pela natureza dos serviços, será providenciada ART ou RRT por profissional habilitado.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 9ª – DOS SERVIÇOS ADICIONAIS</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 2mm 0' }}>9.1. Qualquer serviço não previsto no escopo original será considerado extra e dependerá de orçamento complementar e aprovação formal do CONTRATANTE.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 0 0' }}>9.2. A execução de serviços adicionais implicará ajuste de prazo e valor mediante termo aditivo.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 10ª – DA MULTA E INADIMPLEMENTO</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '0 0 2mm 0' }}>10.1. O atraso no pagamento implicará multa de 2% sobre o valor devido, juros de 1% ao mês e correção monetária pelo índice oficial vigente.</p>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: '2mm 0 0 0' }}>10.2. Em caso de rescisão imotivada por parte do CONTRATANTE, será devida multa equivalente a 10% do valor restante do contrato.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 11ª – DA RESCISÃO</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>11.1. O contrato poderá ser rescindido por descumprimento contratual mediante notificação escrita.</p>
                </div>

                <div className="avoid-break" style={{ marginBottom: '3.5mm' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3mm 0', paddingTop: '2mm', borderBottom: '2px solid #e2e8f0', paddingBottom: '2mm' }}>CLÁUSULA 12ª – DO FORO</h4>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>12.1. Fica eleito o foro da Comarca de <b>{customer?.city || 'Brasília'} - {customer?.state || 'DF'}</b> para dirimir quaisquer controvérsias oriundas deste contrato.</p>
                </div>

                <div style={{ marginTop: '10mm', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                    <p>E por estarem justas e contratadas, assinam as partes o presente instrumento em duas vias de igual teor.</p>
                    <p style={{ marginTop: '5mm' }}>{customer?.city || 'Brasília'}/{customer?.state || 'DF'}, {new Date().getDate()} de {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())} de {new Date().getFullYear()}.</p>
                </div>

                <div className="avoid-break" style={{ margin: '30mm 0 20mm 0' }}>
                    <div style={{ display: 'flex', gap: '16mm', padding: '0 10mm' }}>
                        <div style={{ flex: 1, textAlign: 'center', borderTop: '2px solid #cbd5e1', paddingTop: '3mm' }}>
                            <p style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1mm 0' }}>CONTRATADA</p>
                            <p style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', margin: 0 }}>{company.name}</p>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', borderTop: '2px solid #cbd5e1', paddingTop: '3mm' }}>
                            <p style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1mm 0' }}>CONTRATANTE</p>
                            <p style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', margin: 0 }}>{customer?.name || order.customerName}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

ContractDocument.displayName = 'ContractDocument';
