import React from 'react';
import { Tag, Plus, Trash2, Wallet, DollarSign } from 'lucide-react';
import { FinancialCategory, FinancialAccount } from '../../types';
import { db } from '../../services/db';
import { useNotify } from '../ToastProvider';

interface FinancialSettingsTabProps {
  categories: FinancialCategory[];
  setCategories: React.Dispatch<React.SetStateAction<FinancialCategory[]>>;
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
}

const FinancialSettingsTab: React.FC<FinancialSettingsTabProps> = ({
  categories,
  setCategories,
  accounts,
  setAccounts
}) => {
  const { notify } = useNotify();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Tag className="w-4 h-4" /> Categorias de Lançamento
          </h4>
          <button
            onClick={async () => {
              const name = prompt("Nome da nova categoria:");
              if (!name) return;
              const type = confirm("É uma categoria de RECEITA? (OK para Receita, Cancel para Despesa)") ? 'RECEITA' : 'DESPESA';

              const newCat: FinancialCategory = {
                id: `CAT-${Date.now()}`,
                name,
                type: type as any
              };

              const newList = [...categories, newCat];
              setCategories(newList);
              await db.save('serviflow_financial_categories', newList, newCat);
              notify("Categoria adicionada com sucesso!");
            }}
            className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${cat.type === 'RECEITA' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">{cat.name}</span>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Excluir esta categoria?")) return;
                  const newList = categories.filter(c => c.id !== cat.id);
                  setCategories(newList);
                  await db.remove('serviflow_financial_categories', cat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Contas Bancárias / Caixa
          </h4>
          <button
            onClick={async () => {
              const name = prompt("Nome da conta (ex: Banco do Brasil):");
              if (!name) return;
              const balance = prompt("Saldo Inicial (R$):", "0");

              const newAcc: FinancialAccount = {
                id: `ACC-${Date.now()}`,
                name,
                type: 'Corrente',
                initialBalance: Number(balance) || 0,
                currentBalance: Number(balance) || 0
              };

              const newList = [...accounts, newAcc];
              setAccounts(newList);
              await db.save('serviflow_financial_accounts', newList, newAcc);
              notify("Conta adicionada!");
            }}
            className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="p-5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{acc.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Saldo: R$ {acc.currentBalance.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Remover esta conta?")) return;
                  const newList = accounts.filter(a => a.id !== acc.id);
                  setAccounts(newList);
                  await db.remove('serviflow_financial_accounts', acc.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialSettingsTab;
