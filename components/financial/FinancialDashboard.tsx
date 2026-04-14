import React from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  PieChart,
  Coins,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Transaction, FinancialAccount, FinancialCategory } from '../../types';
import { RealizedItem, selectDashboardTotals, selectChartData, selectTopExpenses, selectTotalBalance } from '../../services/financialSelectors';

interface FinancialDashboardProps {
  allRealized: RealizedItem[];
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  transactions: Transaction[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  setActiveTab: (tab: any) => void;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  allRealized,
  accounts,
  categories,
  transactions,
  selectedYear,
  setSelectedYear,
  setActiveTab
}) => {
  const totals = selectDashboardTotals(allRealized, selectedYear);
  const chartData = selectChartData(allRealized, selectedYear);
  const totalInBank = selectTotalBalance(accounts);
  const topExpenses = selectTopExpenses(allRealized, categories, selectedYear);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Dash Area */}
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Dashboard Executivo</h3>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Faturamento Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">1. Faturamento (Prest. Serviços)</p>
                  <h4 className="text-xl font-black text-emerald-600">
                    R$ {totals.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Recebimento Operacional</p>
              </div>
            </div>

            {/* 2. Despesas Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">2. Despesas (Operacional)</p>
                  <h4 className="text-xl font-black text-rose-600">
                    R$ {totals.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Saídas da Operação</p>
              </div>
            </div>

            {/* 3. Resultado Operacional Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">3. Resultado Operacional</p>
                  <h4 className={`text-xl font-black ${totals.resultadoOperacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    R$ {totals.resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 text-slate-600 rounded-2xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Sobrevivência da Operação</p>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${totals.margemSeguranca >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                    style={{ width: `${Math.min(100, totals.margemSeguranca)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 4. Aportes Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">4. Aportes (Sócios)</p>
                  <h4 className="text-xl font-black text-indigo-600">
                    R$ {totals.aportes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Coins className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase">
                  <CheckCircle2 className="w-3 h-3" /> Capital dos Sócios
                </div>
              </div>
            </div>

            {/* 5. Saldo Final Card */}
            <div className="bg-slate-900 dark:bg-slate-700 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-white/50">5. Saldo Final de Caixa</p>
                  <h4 className={`text-xl font-black ${totals.saldoFinal >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    R$ {totals.saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="p-3 bg-white/10 text-white rounded-2xl">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-[9px] font-bold text-white/40 uppercase">Acompanhamento Profissional</p>
              </div>
            </div>
          </div>

          {/* Fluxo Mensal Chart */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Fluxo de Caixa Mensal ({selectedYear})</h4>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="ent" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="sai" name="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Side Panel: Banks & Top Expenses */}
        <div className="lg:w-72 space-y-5">
          {/* Saldo em Bancos Sidebar */}
          <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Saldo em Bancos</h4>
              <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-3 h-3" />
              </div>
            </div>
            <div className="mb-5">
              <p className="text-2xl font-black">R$ {totalInBank.toLocaleString('pt-BR')}</p>
              <p className="text-[8px] text-emerald-400 font-bold mt-0.5 uppercase">Saldo Consolidado</p>
            </div>
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-black text-[8px]">
                      {acc.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold uppercase">{acc.name}</span>
                  </div>
                  <span className="text-[10px] font-black">R$ {acc.currentBalance.toLocaleString('pt-BR')}</span>
                </div>
              ))}
              <button
                onClick={() => setActiveTab('config')}
                className="w-full py-2 border border-white/10 rounded-xl text-[8px] font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase"
              >
                Gerenciar Contas
              </button>
            </div>
          </div>

          {/* Top Expenses */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Maiores Despesas</h4>
            <div className="space-y-4">
              {topExpenses.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-1.5">
                    <span>{item.name}</span>
                    <span className="text-slate-900 dark:text-white">R$ {item.value.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
