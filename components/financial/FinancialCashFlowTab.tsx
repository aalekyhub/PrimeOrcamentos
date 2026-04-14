import React from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Paperclip,
  Pencil,
  Trash2,
  Coins
} from 'lucide-react';
import { Transaction, AccountEntry, FinancialAccount, FinancialCategory, CompanyProfile } from '../../types';
import { RealizedItem, selectDashboardTotals } from '../../services/financialSelectors';
import { isAporte } from '../../services/financialHelpers';
import { buildFinancialReportHtml } from '../../services/financialPdfService';
import { getTodayIsoDate } from '../../services/dateService';
import { db } from '../../services/db';
import { useNotify } from '../ToastProvider';

interface FinancialCashFlowTabProps {
  allRealized: RealizedItem[];
  accountEntries: AccountEntry[];
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  company: CompanyProfile;
  selectedYear: number;
  setPrintData: (data: any) => void;
  setEditingItem: (item: any) => void;
  setViewingAttachment: (viewer: any) => void;
}

const FinancialCashFlowTab: React.FC<FinancialCashFlowTabProps> = ({
  allRealized,
  accountEntries,
  accounts,
  categories,
  transactions,
  setTransactions,
  company,
  selectedYear,
  setPrintData,
  setEditingItem,
  setViewingAttachment
}) => {
  const { notify } = useNotify();
  const totals = selectDashboardTotals(allRealized, selectedYear);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Faturamento */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
          <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">1. Faturamento (Prest. Serviços)</p>
          <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400">R$ {totals.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        {/* 2. Despesas */}
        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
          <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">2. Despesas (Operacional)</p>
          <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">R$ {totals.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        {/* 3. Resultado Operacional */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">3. Resultado Operacional</p>
          <h3 className={`text-xl font-black ${totals.resultadoOperacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            R$ {totals.resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        {/* 4. Aportes */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
          <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">4. Aportes (Sócios)</p>
          <h3 className="text-xl font-black text-indigo-700 dark:text-indigo-400">R$ {totals.aportes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        {/* 5. Saldo Final */}
        <div className="bg-slate-900 dark:bg-slate-700 p-4 rounded-2xl text-white shadow-lg flex flex-col justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">5. Saldo Final de Caixa</p>
          <h3 className={`text-xl font-black ${totals.saldoFinal >= 0 ? 'text-white' : 'text-rose-400'}`}>
            R$ {totals.saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setPrintData({
            html: buildFinancialReportHtml(allRealized as any, accountEntries, accounts, categories, company, 'EXTRATO', 'Geral'),
            title: 'Extrato de Fluxo de Caixa',
            filename: `EXTRATO_FINANCEIRO_${getTodayIsoDate()}`
          })}
          className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-widest shadow-md"
        >
          <Download className="w-4 h-4" /> Exportar Extrato
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {allRealized.length === 0 ? (
            <div className="py-20 text-center opacity-40">
              <Wallet className="w-12 h-12 mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhuma transação financeira registrada.</p>
            </div>
          ) : (
            allRealized.map(t => {
              const isContribution = isAporte(t.category);
              return (
                <div key={t.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isContribution ? 'bg-indigo-50 text-indigo-500' :
                      t.type === 'DESPESA' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {isContribution ? <Coins className="w-5 h-5" /> :
                        t.type === 'DESPESA' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{t.description}</p>
                        {isContribution && <span className="bg-indigo-600 text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Aporte (Sócio)</span>}
                        {t.attachment && (
                          <button onClick={() => setViewingAttachment({ content: t.attachment!, name: t.attachmentName || 'Anexo' })} className="text-blue-400 hover:text-blue-600">
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        <span>{t.date.split('-').reverse().join('/')}</span>
                        {!isContribution && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{t.category}</span>}
                        {(t.customerName || t.supplierName) && <span className="text-blue-500 px-2 bg-blue-50 rounded">{t.customerName || t.supplierName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-lg font-black ${isContribution ? 'text-indigo-600' : t.type === 'DESPESA' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isContribution ? '+' : t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingItem(t)} className="p-2 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-blue-50">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Excluir esta transação? Isso afetará o saldo da conta.")) return;
                          const newList = transactions.filter(item => item.id !== t.id);
                          setTransactions(newList);
                          await db.remove('serviflow_transactions', t.id);
                          notify("Transação removida.");
                        }}
                        className="p-2 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialCashFlowTab;
