import { Transaction, AccountEntry, FinancialAccount, FinancialCategory, CompanyProfile } from '../types';
import { escapeHtml, formatMoney, formatDateBR } from './formatUtils';
import { RealizedItem } from './financialSelectors';
import { isAporte } from './financialHelpers';

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

export const buildDreReportHtml = (
    allRealized: RealizedItem[],
    categories: FinancialCategory[],
    company: CompanyProfile,
    selectedYear: number
): string => {
    const monthsKeys = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const logoHtml = company.logo
        ? `<img src="${company.logo}" style="max-height:50px; max-width:180px; object-fit:contain;" />`
        : '';

    const renderRow = (label: string, valueFn: (prefix: string) => number, isHeader = false, isFinal = false) => {
        let total = 0;
        const bg = isHeader ? '#f8fafc' : isFinal ? '#0f172a' : 'transparent';
        const color = isFinal ? '#fff' : '#1e293b';
        const weight = isHeader || isFinal ? '900' : '400';
        
        const monthlyTds = monthsKeys.map((_, i) => {
            const monthIdx = i + 1;
            const prefix = `${selectedYear}-${monthIdx < 10 ? '0' : ''}${monthIdx}`;
            const val = valueFn(prefix);
            total += val;
            return `<td style="padding: 8px 4px; border: 1px solid #e2e8f0; text-align: center; color: ${color}; font-weight: ${weight};">${val !== 0 ? formatMoney(val) : '-'}</td>`;
        }).join('');

        return `
            <tr style="background: ${bg};">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 9px; font-weight: ${weight}; color: ${color}; min-width: 150px;">${label}</td>
                ${monthlyTds}
                <td style="padding: 8px 4px; border: 1px solid #e2e8f0; text-align: center; font-weight: 900; background: ${isFinal ? '#1e293b' : '#f1f5f9'}; color: ${isFinal ? '#fff' : '#0f172a'};">${formatMoney(total)}</td>
            </tr>
        `;
    };

    const revenuesRows = categories.filter(c => c.type === 'RECEITA' && !isAporte(c.name)).map(cat => 
        renderRow(cat.name, (prefix) => allRealized.filter(t => t.category === cat.name && t.date.startsWith(prefix) && t.type === 'RECEITA').reduce((a, c) => a + c.amount, 0))
    ).join('');

    const expensesRows = categories.filter(c => c.type === 'DESPESA').map(cat => 
        renderRow(cat.name, (prefix) => allRealized.filter(t => t.category === cat.name && t.date.startsWith(prefix) && t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0))
    ).join('');

    const aportesRows = categories.filter(c => isAporte(c.name)).map(cat => 
        renderRow(cat.name, (prefix) => allRealized.filter(t => t.category === cat.name && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0))
    ).join('');

    return `
        <div style="font-family: Inter, sans-serif; color: #1e293b; padding: 10px; width: 297mm; height: 210mm;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                   ${logoHtml}
                   <h1 style="font-size: 12px; font-weight: 900; margin: 4px 0 0 0;">${escapeHtml(company.name)}</h1>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 11px; font-weight: 800; margin: 0;">DRE GERENCIAL • ANO ${selectedYear}</h2>
                    <p style="font-size: 8px; color: #64748b; margin: 0;">Relatório Consolidado Mensal</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                <thead>
                    <tr style="background: #0f172a; color: #fff;">
                        <th style="padding: 8px; text-align: left; border: 1px solid #1e293b;">DESCRIÇÃO / CATEGORIA</th>
                        ${monthsKeys.map(m => `<th style="padding: 8px 4px; text-align: center; border: 1px solid #1e293b;">${m.toUpperCase()}</th>`).join('')}
                        <th style="padding: 8px; text-align: center; border: 1px solid #1e293b;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #ecfdf5;"><td colspan="14" style="padding: 6px 10px; font-weight: 900; color: #059669; border: 1px solid #e2e8f0;">1. FATURAMENTO BRUTO (RECEITAS)</td></tr>
                    ${revenuesRows}
                    ${renderRow('TOTAL FATURAMENTO (A)', (p) => allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(p)).reduce((a, c) => a + c.amount, 0), true)}

                    <tr style="background: #fff1f2;"><td colspan="14" style="padding: 6px 10px; font-weight: 900; color: #e11d48; border: 1px solid #e2e8f0;">2. DESPESAS OPERACIONAIS</td></tr>
                    ${expensesRows}
                    ${renderRow('TOTAL DESPESAS (B)', (p) => allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(p)).reduce((a, c) => a + c.amount, 0), true)}

                    ${renderRow('RESULTADO OPERACIONAL (A - B)', (p) => {
                        const r = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(p)).reduce((a, c) => a + c.amount, 0);
                        const d = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(p)).reduce((a, c) => a + c.amount, 0);
                        return r - d;
                    }, false, true)}

                    <tr style="background: #f5f3ff;"><td colspan="14" style="padding: 6px 10px; font-weight: 900; color: #7c3aed; border: 1px solid #e2e8f0;">3. FLUXO DE CAPITAL (APORTES/EMPRÉSTIMOS)</td></tr>
                    ${aportesRows}
                    
                    ${renderRow('SALDO FINAL DE CAIXA (LÍQUIDO)', (p) => {
                        const r = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(p)).reduce((a, c) => a + c.amount, 0);
                        const d = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(p)).reduce((a, c) => a + c.amount, 0);
                        const a = allRealized.filter(t => isAporte(t.category) && t.date.startsWith(p)).reduce((acc, c) => acc + c.amount, 0);
                        return (r - d) + a;
                    }, false, true)}
                </tbody>
            </table>

            <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center;">
                <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase;">Relatório DRE Gerencial Mensal • Gerado em ${formatDateBR()} • Prime Orçamentos</p>
            </div>
        </div>
    `;
};
