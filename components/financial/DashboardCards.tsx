import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins 
} from 'lucide-react';

interface DashboardCardsProps {
  curIn: number;
  inGrowth: number;
  curOut: number;
  outGrowth: number;
  totalReceivable: number;
  totalPayable: number;
  onCardClick: (type: 'RECEITA' | 'PAGAR' | 'APORTE') => void;
}

const DashboardCards: React.FC<DashboardCardsProps> = ({
  curIn,
  inGrowth,
  curOut,
  outGrowth,
  totalReceivable,
  totalPayable,
  onCardClick
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* A Receber Card */}
      <div 
        onClick={() => onCardClick('RECEITA')}
        className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/20 cursor-pointer hover:scale-[1.02] transition-all group"
      >
        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">Total à Receber</p>
        <div className="flex items-center justify-between">
          <h4 className="text-3xl font-black text-emerald-900 dark:text-emerald-50">
            R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h4>
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* A Pagar Card */}
      <div 
        onClick={() => onCardClick('PAGAR')}
        className="bg-rose-50/50 dark:bg-rose-900/10 p-6 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/20 cursor-pointer hover:scale-[1.02] transition-all group"
      >
        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4">Total à Pagar</p>
        <div className="flex items-center justify-between">
          <h4 className="text-3xl font-black text-rose-900 dark:text-rose-50">
            R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h4>
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Entradas/Saídas KPIs */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Entradas (Mês Atual)</p>
          <div className="flex items-center gap-4">
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              R$ {curIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <span className={`px-2 py-0.5 ${inGrowth >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} text-[10px] font-black rounded-lg`}>
              {inGrowth >= 0 ? '+' : ''}{inGrowth.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full"></div>
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Saídas (Mês Atual)</p>
          <div className="flex items-center gap-4">
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              - R$ {curOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <span className={`px-2 py-0.5 ${outGrowth <= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} text-[10px] font-black rounded-lg`}>
              {outGrowth > 0 ? '+' : ''}{outGrowth.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCards;
