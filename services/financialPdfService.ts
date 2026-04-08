import { Transaction, AccountEntry, FinancialAccount, FinancialCategory, CompanyProfile } from '../types';
import { escapeHtml, formatMoney, formatDateBR } from './formatUtils';

export const buildFinancialReportHtml = (
    transactions: Transaction[],
    entries: AccountEntry[],
    accounts: FinancialAccount[],
    categories: FinancialCategory[],
    company: CompanyProfile,
    reportType: 'EXTRATO' | 'PROVISAO',
    period: string
): string => {
    const totalIn = transactions.filter(t => t.type === 'RECEITA').reduce((a, b) => a + b.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'DESPESA').reduce((a, b) => a + b.amount, 0);
    const balance = totalIn - totalOut;

    const logoHtml = company.logo
        ? `<img src="${company.logo}" style="max-height:${company.logoSize || 60}px; max-width:200px; object-fit:contain;" />`
        : '';

    const itemsHtml = reportType === 'EXTRATO' 
        ? transactions.map(t => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-size: 10px;">${t.date.split('-').reverse().join('/')}</td>
                <td style="padding: 10px; font-size: 10px; font-weight: 700;">${escapeHtml(t.description)}</td>
                <td style="padding: 10px; font-size: 10px;">${escapeHtml(t.category)}</td>
                <td style="padding: 10px; font-size: 10px; text-align: right; color: ${t.type === 'RECEITA' ? '#10b981' : '#ef4444'}; font-weight: 800;">
                    ${t.type === 'RECEITA' ? '+' : '-'} R$ ${formatMoney(t.amount)}
                </td>
            </tr>
        `).join('')
        : entries.map(e => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-size: 10px;">${e.dueDate.split('-').reverse().join('/')}</td>
                <td style="padding: 10px; font-size: 10px; font-weight: 700;">${escapeHtml(e.description)}</td>
                <td style="padding: 10px; font-size: 10px; text-align: center;">
                    <span style="padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 8px; font-weight: 900;">${e.status}</span>
                </td>
                <td style="padding: 10px; font-size: 10px; text-align: right; color: ${e.type === 'RECEBER' ? '#10b981' : '#ef4444'}; font-weight: 800;">
                    R$ ${formatMoney(e.amount)}
                </td>
            </tr>
        `).join('');

    return `
        <div style="font-family: Inter, sans-serif; color: #1e293b; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                   ${logoHtml}
                   <h1 style="font-size: 14px; font-weight: 900; margin: 5px 0 0 0;">${escapeHtml(company.name)}</h1>
                   <p style="font-size: 9px; color: #64748b; margin: 0;">${escapeHtml(company.cnpj || '')}</p>
                </div>
                <div style="text-align: right;">
                    <div style="background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 900;">FINANCEIRO</div>
                    <h2 style="font-size: 12px; font-weight: 800; margin: 8px 0 0 0;">${reportType === 'EXTRATO' ? 'Extrato de Fluxo de Caixa' : 'Relatório de Provisões'}</h2>
                    <p style="font-size: 9px; color: #64748b; margin: 0;">Período: ${period}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">Total Entradas</p>
                    <p style="font-size: 14px; font-weight: 800; color: #10b981; margin: 4px 0 0 0;">R$ ${formatMoney(totalIn)}</p>
                </div>
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">Total Saídas</p>
                    <p style="font-size: 14px; font-weight: 800; color: #ef4444; margin: 4px 0 0 0;">R$ ${formatMoney(totalOut)}</p>
                </div>
                <div style="background: #0f172a; padding: 12px; border-radius: 8px;">
                    <p style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Saldo Operacional</p>
                    <p style="font-size: 14px; font-weight: 800; color: #fff; margin: 4px 0 0 0;">R$ ${formatMoney(balance)}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 10px; text-align: left; font-size: 9px; font-weight: 900;">DATA</th>
                        <th style="padding: 10px; text-align: left; font-size: 9px; font-weight: 900;">DESCRIÇÃO</th>
                        <th style="padding: 10px; text-align: left; font-size: 9px; font-weight: 900;">${reportType === 'EXTRATO' ? 'CATEGORIA' : 'STATUS'}</th>
                        <th style="padding: 10px; text-align: right; font-size: 9px; font-weight: 900;">VALOR</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
                <p style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">Documento gerado em ${formatDateBR()} - Prime Orçamentos</p>
            </div>
        </div>
    `;
};
