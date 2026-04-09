import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Paperclip,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Pencil
} from 'lucide-react';
import { AccountEntry, FinancialAccount } from '../../types';

interface EntriesTableProps {
  entries: AccountEntry[];
  accounts: FinancialAccount[];
  onSettle: (entry: AccountEntry) => void;
  onEdit: (entry: AccountEntry) => void;
  onDelete: (id: string) => void;
  onViewAttachment: (entry: AccountEntry) => void;
}

const EntriesTable: React.FC<EntriesTableProps> = ({ 
  entries, 
  accounts, 
  onSettle, 
  onEdit,
  onDelete, 
  onViewAttachment 
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição / Categoria</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-8 text-center text-slate-400 text-xs italic">
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all duration-300">
                  <td className="px-8 py-3">
                    <div className="flex items-center gap-2">
                      {entry.status === 'PAGO' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Liquidado</span>
                        </div>
                      ) : entry.status === 'ATRASADO' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Atrasado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg">
                          <Clock className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Pendente</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 group/desc">
                        {entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO' ? (
                          <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className="p-1 bg-rose-50 text-rose-600 rounded-md">
                            <ArrowDownLeft className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                          {entry.description}
                        </span>
                        {entry.attachment && (
                          <Paperclip className="w-3 h-3 text-blue-400 cursor-pointer" onClick={() => onViewAttachment(entry)} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                          {entry.category}
                        </span>
                        {(entry.customerName || entry.supplierName) && (
                          <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                            {entry.customerName || entry.supplierName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                      {entry.paymentDate && (
                        <span className="text-[8px] font-medium text-emerald-500 mt-0.5 italic">
                          Pago em {new Date(entry.paymentDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-[13px] font-black ${
                        entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO' ? '+' : '-'} R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {entry.status === 'PAGO' && entry.accountId && (
                        <div className="flex items-center gap-1 mt-0.5">
                           <TrendingUp className="w-2 h-2 text-slate-400" />
                           <span className="text-[8px] font-bold text-slate-400 uppercase italic">
                             {accounts.find(a => a.id === entry.accountId)?.name || 'Conta Removida'}
                           </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       {entry.status === 'PENDENTE' && (
                         <button 
                           onClick={() => onSettle(entry)}
                           className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                           title="Dar Baixa (Receber/Pagar)"
                         >
                           <Coins className="w-4 h-4" />
                         </button>
                       )}
                       <button 
                         onClick={() => onEdit(entry)}
                         className="p-2.5 bg-blue-50 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                         title="Editar Lançamento"
                       >
                         <Pencil className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => onDelete(entry.id)}
                         className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                         title="Excluir Lançamento"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntriesTable;
