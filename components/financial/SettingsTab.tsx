import React from 'react';
import { 
  Plus, 
  Trash2, 
  Tag, 
  Wallet,
  Coins
} from 'lucide-react';
import { FinancialAccount, FinancialCategory, CategoryNature } from '../../types';

interface SettingsTabProps {
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  onAddAccount: () => void;
  onDeleteAccount: (id: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  accounts,
  categories,
  onAddAccount,
  onDeleteAccount,
  onAddCategory,
  onDeleteCategory
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Gestão de Categorias */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4" /> Categorias de Lançamento
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Defina as naturezas do seu negócio</p>
          </div>
          <button 
            onClick={onAddCategory}
            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl group border border-transparent hover:border-slate-200 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${cat.type === 'RECEITA' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                <div>
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.name}</span>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100">
                      {cat.type}
                    </span>
                    {cat.nature && (
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100/50">
                        {cat.nature}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => onDeleteCategory(cat.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Gestão de Contas Bancárias */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5">
           <Wallet className="w-48 h-48 rotate-12" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4" /> Contas Bancárias / Caixa
              </h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase italic">Saldo consolidado e gestão de ativos</p>
            </div>
            <button 
              onClick={onAddAccount}
              className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all border border-white/10"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="p-5 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">{acc.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Saldo em conta</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-lg font-black">R$ {acc.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button 
                    onClick={() => onDeleteAccount(acc.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
