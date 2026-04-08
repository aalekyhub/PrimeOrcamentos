import React, { useState } from 'react';
import { X, CheckCircle2, Wallet, DollarSign } from 'lucide-react';
import { AccountEntry, FinancialAccount } from '../../types';

interface SettlementModalProps {
  entry: AccountEntry | null;
  accounts: FinancialAccount[];
  onConfirm: (entryId: string, accountId: string) => void;
  onClose: () => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({
  entry,
  accounts,
  onConfirm,
  onClose
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Confirmar Baixa</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumo do Lançamento</p>
            <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">{entry.description}</h4>
            <p className={`text-2xl font-black ${entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO' ? 'text-emerald-500' : 'text-rose-500'}`}>
              R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Selecione a Conta Origem/Destino</label>
            <div className="grid grid-cols-1 gap-3">
              {accounts.map(acc => (
                <div 
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    selectedAccountId === acc.id 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedAccountId === acc.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{acc.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">Saldo: R$ {acc.currentBalance.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  {selectedAccountId === acc.id && (
                    <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onConfirm(entry.id, selectedAccountId)}
            disabled={!selectedAccountId}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <DollarSign className="w-5 h-5" />
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
