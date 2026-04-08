import React from 'react';
import { 
  PieChart, 
  Filter, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Coins
} from 'lucide-react';
import { FinancialCategory, Transaction, AccountEntry } from '../../types';

interface ResultsTabProps {
  categories: FinancialCategory[];
  allRealized: any[];
  accountEntries: AccountEntry[];
  selectedYear: number;
  isAporte: (cat: string) => boolean;
}

const ResultsTab: React.FC<ResultsTabProps> = ({
  categories,
  allRealized,
  accountEntries,
  selectedYear,
  isAporte
}) => {
  const yearStr = selectedYear.toString();
  
  const revenues = allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(yearStr));
  const expenses = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(yearStr));
  
  const totalIn = revenues.reduce((a, c) => a + c.amount, 0);
  const totalOut = expenses.reduce((a, c) => a + c.amount, 0);
  
  const salesIn = revenues.filter(t => !isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
  const aportesIn = revenues.filter(t => isAporte(t.category)).reduce((a, c) => a + c.amount, 0);

  const result = totalIn - totalOut;
  const margin = totalIn > 0 ? (result / totalIn) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição de Receitas */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Distribuição de Receitas ({selectedYear})
          </h4>
          <div className="space-y-4">
            {categories.filter(c => c.type === 'RECEITA').map(cat => {
              const total = revenues.filter(t => t.category === cat.name).reduce((a, c) => a + c.amount, 0);
              const percent = totalIn > 0 ? (total / totalIn) * 100 : 0;
              if (total === 0) return null;
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

        {/* Distribuição de Despesas */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Distribuição de Despesas ({selectedYear})
          </h4>
          <div className="space-y-4">
            {categories.filter(c => c.type === 'DESPESA').map(cat => {
              const total = expenses.filter(t => t.category === cat.name).reduce((a, c) => a + c.amount, 0);
              const percent = totalOut > 0 ? (total / totalOut) * 100 : 0;
              if (total === 0) return null;
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

      {/* DRE Simplificado - Card de Resultado */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
           <TrendingUp className="w-48 h-48 rotate-12" />
        </div>
        
        <div className="relative z-10">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Resultado do Período ({selectedYear})</h4>
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div>
              <p className={`text-5xl font-black ${result >= 0 ? 'text-white' : 'text-rose-400'}`}>
                R$ {result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase text-emerald-400">Receitas: R$ {salesIn.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[10px] font-black uppercase text-rose-400">Despesas: R$ {totalOut.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <Coins className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase text-indigo-400">Aportes: R$ {aportesIn.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-right">Margem / Índice de Sobra</p>
              <div className="flex items-center justify-end gap-3 text-3xl font-black">
                 <span className={margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{margin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;
