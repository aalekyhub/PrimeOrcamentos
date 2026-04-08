import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  Paperclip,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { Transaction } from '../../types';

interface TransactionsHistoryProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onViewAttachment: (t: Transaction) => void;
  onExport: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const TransactionsHistory: React.FC<TransactionsHistoryProps> = ({
  transactions,
  onDelete,
  onViewAttachment,
  onExport,
  searchQuery,
  setSearchQuery
}) => {
  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Pesquisar em transações..."
            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl py-3.5 pl-12 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={onExport}
          className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
        >
          <Download className="w-4 h-4" /> Exportar Extrato
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm italic">
              Nenhuma transação encontrada no histórico.
            </div>
          ) : (
            filtered.map(t => (
              <div key={t.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                  }`}>
                    {t.type === 'RECEITA' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {t.description}
                      </span>
                      {t.attachment && (
                        <Paperclip 
                          className="w-3.5 h-3.5 text-blue-400 cursor-pointer" 
                          onClick={() => onViewAttachment(t)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                       <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                       <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{t.category}</span>
                       {(t.customerName || t.supplierName) && (
                         <span className="text-blue-500 px-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                           {t.customerName || t.supplierName}
                         </span>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="text-right">
                    <p className={`text-xl font-black ${t.type === 'RECEITA' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'RECEITA' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                      ID: {t.id}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => onDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-3 bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsHistory;
