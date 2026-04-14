import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  PieChart,
  Filter,
  FileText,
  Calendar,
  Tag,
  Paperclip,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Pencil
} from 'lucide-react';
import { AccountEntry, Transaction, FinancialCategory, CompanyProfile } from '../../types';
import { isAporte, getStatusColor } from '../../services/financialHelpers';
import { buildFinancialReportHtml } from '../../services/financialPdfService';
import { getTodayIsoDate } from '../../services/dateService';
import { db } from '../../services/db';
import { useNotify } from '../ToastProvider';

interface FinancialProvisionTabProps {
  accountEntries: AccountEntry[];
  setAccountEntries: React.Dispatch<React.SetStateAction<AccountEntry[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  categories: FinancialCategory[];
  company: CompanyProfile;
  entrySearch: string;
  setEntrySearch: (s: string) => void;
  entryTypeFilter: string;
  setEntryTypeFilter: (f: any) => void;
  setShowEntryForm: (show: boolean) => void;
  setFormData: (data: any) => void;
  initialFormData: any;
  setPrintData: (data: any) => void;
  setEditingItem: (item: any) => void;
  setViewingAttachment: (viewer: any) => void;
  handleToggleStatus: (entry: AccountEntry) => Promise<void>;
}

const FinancialProvisionTab: React.FC<FinancialProvisionTabProps> = ({
  accountEntries,
  setAccountEntries,
  transactions,
  setTransactions,
  categories,
  company,
  entrySearch,
  setEntrySearch,
  entryTypeFilter,
  setEntryTypeFilter,
  setShowEntryForm,
  setFormData,
  initialFormData,
  setPrintData,
  setEditingItem,
  setViewingAttachment,
  handleToggleStatus
}) => {
  const { notify } = useNotify();

  const filteredEntries = accountEntries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(entrySearch.toLowerCase()) ||
      (entry.customerName?.toLowerCase().includes(entrySearch.toLowerCase())) ||
      (entry.supplierName?.toLowerCase().includes(entrySearch.toLowerCase()));
    const matchesType = entryTypeFilter === 'ALL' || entry.type === entryTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => {
            setFormData({ ...initialFormData, type: 'PAGAR' as any });
            setShowEntryForm(true);
          }}
          className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 group-hover:rotate-12 transition-transform">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Pagar</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">R$ {accountEntries.filter(e => e.type === 'PAGAR' && !isAporte(e.category) && e.status !== 'PAGO').reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => {
            setFormData({ ...initialFormData, type: 'RECEITA' as any });
            setShowEntryForm(true);
          }}
          className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:rotate-12 transition-transform">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Receber</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">R$ {accountEntries.filter(e => e.type === 'RECEBER' && !isAporte(e.category) && e.status !== 'PAGO').reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => {
            const aporteCat = categories.find(c => isAporte(c.name))?.name || 'Aporte de Sócios';
            setFormData({ ...initialFormData, type: 'INVESTIMENTO' as any, category: aporteCat });
            setShowEntryForm(true);
          }}
          className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-indigo-100 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:rotate-12 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Empréstimos de Sócios</p>
              <p className="text-xl font-black text-indigo-600">R$ {accountEntries.filter(e => (e.type === 'INVESTIMENTO' || isAporte(e.category))).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-200 dark:shadow-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeção Final</p>
              <p className="text-xl font-black text-white">R$ {(
                accountEntries.filter(e => (e.type === 'RECEBER' && !isAporte(e.category)) && e.status !== 'PAGO').reduce((a, c) => a + c.amount, 0) -
                accountEntries.filter(e => (e.type === 'PAGAR' && !isAporte(e.category)) && e.status !== 'PAGO').reduce((a, c) => a + c.amount, 0) +
                accountEntries.filter(e => (e.type === 'INVESTIMENTO' || isAporte(e.category)) && e.status !== 'PAGO').reduce((a, c) => a + c.amount, 0)
              ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por descrição, cliente ou fornecedor..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl py-3 pl-12 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              value={entrySearch}
              onChange={e => setEntrySearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'RECEBER', label: 'A Receber' },
              { id: 'PAGAR', label: 'A Pagar' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setEntryTypeFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryTypeFilter === f.id ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPrintData({
                  html: buildFinancialReportHtml(transactions, accountEntries, accounts, categories, company, 'PROVISAO', 'Pendente'),
                  title: 'Relatório de Provisões',
                  filename: `PROVISOES_${getTodayIsoDate()}`
                })}
                className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-200 transition-all"
              >
                <FileText className="w-4 h-4" /> Exportar Provisões
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredEntries.map(entry => {
            const isContribution = isAporte(entry.category);
            return (
              <div key={entry.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isContribution ? 'bg-indigo-50 text-indigo-500' :
                      entry.type === 'RECEBER' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                    }`}>
                    {isContribution ? <Coins className="w-6 h-6" /> :
                      entry.type === 'RECEBER' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{entry.description}</span>
                      {entry.attachment && (
                        <button
                          onClick={() => setViewingAttachment({ content: entry.attachment!, name: entry.attachmentName || 'Anexo' })}
                          className="text-blue-400 hover:text-blue-600"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${isContribution ? 'hidden' : getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {isContribution ? 'Entrada' : 'Venc.'} {entry.dueDate.split('-').reverse().join('/')}</span>
                      {!isContribution && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {entry.category}</span>}
                      {(entry.customerName || entry.supplierName) && (
                        <span className="text-blue-500 px-2 bg-blue-50 rounded">
                          {entry.customerName || entry.supplierName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="text-right">
                    <p className={`text-xl font-black ${isContribution ? 'text-indigo-600' : entry.type === 'RECEBER' ? 'text-emerald-600' : 'text-rose-600'} leading-none`}>
                      R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase mt-1 tracking-tighter">{entry.id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.status === 'PENDENTE' && (
                      <button
                        onClick={() => handleToggleStatus(entry)}
                        className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Baixar Título
                      </button>
                    )}
                    <button onClick={() => setEditingItem(entry)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Remover este lançamento permanentemente?")) return;
                        const newList = accountEntries.filter(e => e.id !== entry.id);
                        setAccountEntries(newList);
                        await db.remove('serviflow_account_entries', entry.id);
                        notify("Lançamento removido.");
                      }}
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredEntries.length === 0 && (
            <div className="py-20 text-center opacity-40">
              <Calendar className="w-12 h-12 mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum lançamento pendente encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialProvisionTab;
