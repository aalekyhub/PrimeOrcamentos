import React from 'react';
import { PieChart, Download, Filter, Info } from 'lucide-react';
import { FinancialCategory, CompanyProfile } from '../../types';
import { RealizedItem } from '../../services/financialSelectors';
import { isAporte } from '../../services/financialHelpers';
import { buildDreReportHtml } from '../../services/financialPdfService';
import { useNotify } from '../ToastProvider';

interface FinancialReportsTabProps {
  allRealized: RealizedItem[];
  categories: FinancialCategory[];
  company: CompanyProfile;
  selectedYear: number;
  setPrintData: (data: any) => void;
}

const FinancialReportsTab: React.FC<FinancialReportsTabProps> = ({
  allRealized,
  categories,
  company,
  selectedYear,
  setPrintData
}) => {
  const { notify } = useNotify();
  const monthsKeys = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* DRE Header */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
            <PieChart className="text-blue-500" /> DRE Gerencial
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Demonstrativo de Resultados do Exercício • Ano {selectedYear}</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setPrintData({
                  html: buildDreReportHtml(allRealized, categories, company, selectedYear),
                  title: `DRE Gerencial - ${selectedYear}`,
                  filename: `DRE_${selectedYear}`
                });
                notify("Gerando Relatório DRE...");
              }}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <PieChart className="w-4 h-4" /> Exportar PDF
            </button>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Distribuição de Receitas
          </h4>
          <div className="space-y-4">
            {categories.filter(c => c.type === 'RECEITA' && !isAporte(c.name)).map(cat => {
              const total = allRealized.filter(t => t.category === cat.name && t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
              const grandTotal = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
              const percent = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between text-xs font-bold mb-1 uppercase">
                    <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                    <span className="text-slate-900 dark:text-white">R$ {total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Distribuição de Despesas
          </h4>
          <div className="space-y-4">
            {categories.filter(c => c.type === 'DESPESA').map(cat => {
              const total = allRealized.filter(t => t.category === cat.name && t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
              const grandTotal = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
              const percent = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between text-xs font-bold mb-1 uppercase">
                    <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                    <span className="text-slate-900 dark:text-white">R$ {total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resultado do Período Summary Card */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Resultado do Período (Entradas vs Despesas)</h4>
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <p className="text-4xl font-black">
              R$ {(
                allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) -
                allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)
              ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                VENDAS: R$ {allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">
                DESPESAS: R$ {allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                APORTES: R$ {allRealized.filter(t => isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Índice de Sobra</p>
            <p className="text-2xl font-black">
              {allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) > 0
                ? (((allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) - allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)) / allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)) * 100).toFixed(1)
                : '0'
              }%
            </p>
          </div>
        </div>
      </div>

      {/* DRE Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Descrição / Categoria</th>
                {monthsKeys.map(m => (
                  <th key={m} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 dark:border-slate-800">{m}</th>
                ))}
                <th className="p-4 text-[10px] font-black text-blue-500 uppercase tracking-widest text-center border-l-2 border-slate-100 dark:border-slate-800 bg-blue-50/30">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* RECEITAS SECTION */}
              <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                <td colSpan={14} className="p-4 px-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest">1. Faturamento Total (Prest. Serviços)</td>
              </tr>
              {categories.filter(c => c.type === 'RECEITA' && !isAporte(c.name)).map(cat => {
                let catTotal = 0;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 px-8 text-xs font-bold text-slate-600 dark:text-slate-300 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-800">{cat.name}</td>
                    {monthsKeys.map((_, i) => {
                      const monthIdx = i + 1;
                      const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                      const realPrefix = `${selectedYear}-${monthFix}`;
                      const val = allRealized.filter(t => t.category === cat.name && t.date.startsWith(realPrefix) && t.type === 'RECEITA').reduce((a, c) => a + c.amount, 0);
                      catTotal += val;
                      return (
                        <td key={i} className="p-4 text-xs font-bold text-slate-500 text-center">{val > 0 ? val.toLocaleString('pt-BR') : '-'}</td>
                      );
                    })}
                    <td className="p-4 text-xs font-black text-emerald-600 text-center bg-emerald-50/10 border-l border-slate-100 dark:border-slate-800">{catTotal.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
              <tr className="bg-emerald-50/40 dark:bg-emerald-900/20 font-black">
                <td className="p-4 px-6 text-xs text-emerald-700 dark:text-emerald-400 uppercase sticky left-0 z-20 bg-emerald-50 dark:bg-slate-900 border-r border-emerald-100 dark:border-emerald-900/30">Total Faturamento (A)</td>
                {monthsKeys.map((_, i) => {
                  const monthIdx = i + 1;
                  const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                  const prefix = `${selectedYear}-${monthFix}`;
                  const val = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  return <td key={i} className="p-4 text-xs text-center">{val.toLocaleString('pt-BR')}</td>
                })}
                <td className="p-4 text-xs text-center border-l-2 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  {allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
                </td>
              </tr>

              {/* DESPESAS SECTION */}
              <tr className="bg-rose-50/30 dark:bg-rose-900/10">
                <td colSpan={14} className="p-4 px-6 text-[10px] font-black text-rose-600 uppercase tracking-widest">2. Despesas Operacionais</td>
              </tr>
              {categories.filter(c => c.type === 'DESPESA').map(cat => {
                let catTotal = 0;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 px-8 text-xs font-bold text-slate-600 dark:text-slate-300 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-800">{cat.name}</td>
                    {monthsKeys.map((_, i) => {
                      const monthIdx = i + 1;
                      const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                      const prefix = `${selectedYear}-${monthFix}`;
                      const val = allRealized.filter(t => t.category === cat.name && t.date.startsWith(prefix) && t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
                      catTotal += val;
                      return (
                        <td key={i} className="p-4 text-xs font-bold text-slate-500 text-center">{val > 0 ? val.toLocaleString('pt-BR') : '-'}</td>
                      );
                    })}
                    <td className="p-4 text-xs font-black text-rose-600 text-center bg-rose-50/10 border-l border-slate-100 dark:border-slate-800">{catTotal.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
              <tr className="bg-rose-50/40 dark:bg-rose-900/20 font-black">
                <td className="p-4 px-6 text-xs text-rose-700 dark:text-rose-400 uppercase sticky left-0 z-20 bg-rose-50 dark:bg-slate-900 border-r border-rose-100 dark:border-rose-900/30">Total Despesas (B)</td>
                {monthsKeys.map((_, i) => {
                  const monthIdx = i + 1;
                  const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                  const prefix = `${selectedYear}-${monthFix}`;
                  const val = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  return <td key={i} className="p-4 text-xs text-center">{val.toLocaleString('pt-BR')}</td>
                })}
                <td className="p-4 text-xs text-center border-l-2 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400">
                  {allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
                </td>
              </tr>

              {/* RESULTADO OPERACIONAL */}
              <tr className="bg-slate-900 text-white font-black">
                <td className="p-6 px-6 text-xs uppercase sticky left-0 z-20 bg-slate-900">Resultado Operacional (A - B)</td>
                {monthsKeys.map((_, i) => {
                  const monthIdx = i + 1;
                  const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                  const prefix = `${selectedYear}-${monthFix}`;
                  const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  const des = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  const result = fat - des;
                  return <td key={i} className="p-4 text-xs text-center border-l border-white/5">{result.toLocaleString('pt-BR')}</td>
                })}
                <td className="p-4 text-xs text-center border-l-2 border-white/20 bg-white/10 text-emerald-400">
                  {(allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) - allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)).toLocaleString('pt-BR')}
                </td>
              </tr>

              {/* APORTES SECTION */}
              <tr className="bg-indigo-50/20 dark:bg-indigo-900/5">
                <td colSpan={14} className="p-4 px-6 text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">3. Fluxo de Capital (Aportes/Empréstimos)</td>
              </tr>
              {categories.filter(c => isAporte(c.name)).map(cat => {
                let catTotal = 0;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors italic">
                    <td className="p-4 px-10 text-[11px] font-bold text-slate-400 dark:text-slate-500 sticky left-0 z-20 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-800">{cat.name}</td>
                    {monthsKeys.map((_, i) => {
                      const monthIdx = i + 1;
                      const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                      const prefix = `${selectedYear}-${monthFix}`;
                      const val = allRealized.filter(t => t.category === cat.name && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                      catTotal += val;
                      return (
                        <td key={i} className="p-4 text-xs font-bold text-slate-400 text-center">{val > 0 ? val.toLocaleString('pt-BR') : '-'}</td>
                      );
                    })}
                    <td className="p-4 text-xs font-black text-indigo-400 text-center bg-indigo-50/5 border-l border-slate-100 dark:border-slate-800">{catTotal.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
              
              {/* SALDO FINAL DE CAIXA */}
              <tr className="bg-blue-600 text-white font-black">
                <td className="p-6 px-6 text-xs uppercase sticky left-0 z-20 bg-blue-600">Saldo Final de Caixa (Líquido)</td>
                {monthsKeys.map((_, i) => {
                  const monthIdx = i + 1;
                  const monthFix = monthIdx < 10 ? `0${monthIdx}` : `${monthIdx}`;
                  const prefix = `${selectedYear}-${monthFix}`;
                  const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  const des = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  const apor = allRealized.filter(t => isAporte(t.category) && t.date.startsWith(prefix)).reduce((a, c) => a + c.amount, 0);
                  const saldoFinal = (fat - des) + apor;
                  return <td key={i} className="p-4 text-xs text-center border-l border-white/5">{saldoFinal.toLocaleString('pt-BR')}</td>
                })}
                <td className="p-4 text-sm text-center border-l-2 border-white/20 bg-white/20">
                  {(allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) - allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) + allRealized.filter(t => isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)).toLocaleString('pt-BR')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Info className="w-4 h-4 text-blue-500" />
              Este relatório apresenta o Demonstrativo de Resultados consolidado por competência de recebimento/pagamento.
           </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportsTab;
