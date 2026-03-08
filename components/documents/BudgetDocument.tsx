import React from 'react';
import { ServiceOrder, CompanyProfile } from '../../types';
import { toNumber, roundMoney, formatMoney } from '../../services/formatUtils';

interface BudgetDocumentProps {
    budget: ServiceOrder;
    company: CompanyProfile;
    customerDoc?: string;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
    } catch {
        return new Date().toLocaleDateString('pt-BR');
    }
};

export const BudgetDocument = React.forwardRef<HTMLDivElement, BudgetDocumentProps>(
    ({ budget, company, customerDoc }, ref) => {

        const eDate = formatDate(budget.createdAt);
        const vDays = company.defaultProposalValidity || 15;
        const vDate = budget.dueDate ? formatDate(budget.dueDate) : formatDate(new Date(new Date(budget.createdAt || Date.now()).getTime() + vDays * 24 * 60 * 60 * 1000).toISOString());

        // Totals calculations
        const subTotal = roundMoney(
            budget.items?.reduce((acc, item) => {
                return acc + (toNumber(item.unitPrice) * toNumber(item.quantity));
            }, 0) || 0
        );

        const bdiRate = Math.max(0, toNumber(budget.bdiRate));
        const taxRate = Math.min(99.99, Math.max(0, toNumber(budget.taxRate)));

        const bdiValue = roundMoney(subTotal * (bdiRate / 100));
        const subTotalWithBDI = roundMoney(subTotal + bdiValue);
        const taxFactorBody = Math.max(0.0001, 1 - (taxRate / 100));
        const finalTotal = roundMoney(subTotalWithBDI / taxFactorBody);
        const taxValue = roundMoney(finalTotal - subTotalWithBDI);

        const itemFBase = company.itemsFontSize || 12;

        return (
            <div ref={ref} className="pdf-page print-description-content">

                {/* Header */}
                <div className="pdf-header" style={{ paddingBottom: '25px', borderBottom: '3px solid #000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                {company.logo ? (
                                    <img src={company.logo} style={{ height: `${company.logoSize || 80}px`, maxWidth: '250px', objectFit: 'contain' }} alt="Logo" />
                                ) : (
                                    <div style={{ fontWeight: 900, fontSize: '32px', color: '#1e3a8a' }}>PRIME</div>
                                )}
                            </div>
                            <div>
                                <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                                    {company.name}
                                </h1>
                                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                    SOLUÇÕES em Gestão Profissional
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                                    {company.cnpj || ''} | {company.phone || ''}
                                </p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#2563eb' }}>{budget.id}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>EMISSÃO: {eDate}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>VALIDADE: {vDate}</p>
                        </div>
                    </div>
                </div>

                {/* Client Box */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }} className="avoid-break">
                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>CLIENTE / DESTINATÁRIO</span>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', lineHeight: 1.4 }}>{budget.customerName || 'Não Informado'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{customerDoc || 'CPF/CNPJ não informado'}</div>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>REFERÊNCIA DO ORÇAMENTO</span>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', lineHeight: 1.4 }}>{budget.description || 'PROPOSTA COMERCIAL'}</div>
                    </div>
                </div>

                {/* Description Blocks */}
                <div className="pdf-section avoid-break" style={{ marginBottom: '32px' }}>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em' }}>PROPOSTA COMERCIAL</h2>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', lineHeight: 1.3 }}>{budget.description}</p>
                </div>

                {budget.descriptionBlocks && budget.descriptionBlocks.length > 0 && (
                    <div style={{ marginBottom: '48px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            DESCRIÇÃO DOS SERVIÇOS
                        </div>
                        <div style={{ display: 'block' }}>
                            {budget.descriptionBlocks.map((block, index) => {
                                if (block.type === 'text') {
                                    return (
                                        <div
                                            key={index}
                                            className="ql-editor-print"
                                            style={{ fontSize: `${company.descriptionFontSize || 14}px`, color: '#334155', lineHeight: 1.6, textAlign: 'justify', marginBottom: '24px' }}
                                            dangerouslySetInnerHTML={{ __html: block.content || '' }}
                                        />
                                    );
                                } else if (block.type === 'image') {
                                    return (
                                        <div key={index} className="avoid-break" style={{ margin: '24px 0', display: 'block', textAlign: 'center' }}>
                                            <img src={block.content} style={{ width: 'auto', maxWidth: '100%', borderRadius: '8px', display: 'block', margin: '0 auto', objectFit: 'contain', maxHeight: '250mm' }} alt="Referência" />
                                        </div>
                                    );
                                } else if (block.type === 'page-break') {
                                    return <div key={index} className="page-break" style={{ height: 0 }}></div>;
                                }
                                return null;
                            })}
                        </div>
                    </div>
                )}

                {/* Items Table */}
                <div className="pdf-section" style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '6px', marginBottom: '4px' }}>
                        DETALHAMENTO FINANCEIRO
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '6px 0', fontSize: '10px', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', fontWeight: 800, width: '55%', letterSpacing: '0.05em' }}>ITEM / DESCRIÇÃO</th>
                                <th style={{ padding: '6px 0', fontSize: '10px', textTransform: 'uppercase', color: '#64748b', textAlign: 'center', fontWeight: 800, width: '10%', letterSpacing: '0.05em' }}>QTD</th>
                                <th style={{ padding: '6px 0', fontSize: '10px', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', fontWeight: 800, width: '17.5%', letterSpacing: '0.05em' }}>UNITÁRIO</th>
                                <th style={{ padding: '6px 0', fontSize: '10px', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', fontWeight: 800, width: '17.5%', letterSpacing: '0.05em' }}>SUBTOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budget.items?.map((item, index) => (
                                <tr key={item.id || index} className="avoid-break" style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 0', fontWeight: 600, textTransform: 'uppercase', fontSize: `${itemFBase}px`, color: '#334155', width: '55%', verticalAlign: 'top' }}>
                                        {item.description}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: `${itemFBase}px`, width: '10%', verticalAlign: 'top' }}>
                                        {toNumber(item.quantity).toString().replace('.', ',')} {item.unit || ''}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#475569', fontSize: `${itemFBase}px`, width: '17.5%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                        R$ {formatMoney(item.unitPrice)}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: `${itemFBase}px`, color: '#0f172a', width: '17.5%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                        R$ {formatMoney(toNumber(item.unitPrice) * toNumber(item.quantity))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="pdf-section avoid-break" style={{ marginTop: '20px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', gap: '40px', paddingRight: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em', marginBottom: '2px', lineHeight: 1.2 }}>SUBTOTAL</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', whiteSpace: 'nowrap' }}>R$ {formatMoney(subTotal)}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>BDI ({bdiRate}%)</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', display: 'block', whiteSpace: 'nowrap' }}>+ R$ {formatMoney(bdiValue)}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>IMPOSTOS ({taxRate}%)</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', display: 'block', whiteSpace: 'nowrap' }}>+ R$ {formatMoney(taxValue)}</span>
                        </div>
                    </div>

                    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '10px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>INVESTIMENTO TOTAL:</span>
                        <span style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.05em', whiteSpace: 'nowrap' }}>R$ {formatMoney(finalTotal)}</span>
                    </div>
                </div>

                {/* Terms */}
                <div className="pdf-section avoid-break" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>FORMA DE PAGAMENTO</span>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155', lineHeight: 1.5 }}>{budget.paymentTerms || 'A combinar'}</p>
                        </div>
                        <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>PRAZO DE ENTREGA / EXECUÇÃO</span>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155', lineHeight: 1.5 }}>{budget.deliveryTime || 'A combinar'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pdf-footer avoid-break">
                    <div style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '12px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ background: '#2563eb', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>?</div>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TERMO DE ACEITE E AUTORIZAÇÃO PROFISSIONAL</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', fontWeight: 600 }}>
                            "Este documento constitui uma proposta comercial formal. Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações técnicas descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. A contratada reserva-se o direito de renegociar valores caso a aprovação ocorra após o prazo de validade de {vDays} dias. Eventuais alterações de escopo solicitadas após o aceite estarão sujeitas a nova análise de custos."
                        </p>
                    </div>
                    <div className="avoid-break" style={{ marginTop: '100px' }}>
                        <div style={{ borderBottom: '2px solid #cbd5e1', width: '400px', maxWidth: '100%' }}></div>
                        <p style={{ margin: '12px 0 0 0', fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.4, paddingBottom: '2px' }}>ASSINATURA DO CLIENTE / ACEITE</p>
                    </div>
                </div>

            </div >
        );
    }
);

BudgetDocument.displayName = 'BudgetDocument';
