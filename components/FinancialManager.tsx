
import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Calendar, 
  Tag, 
  Trash2, 
  Settings, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { 
  Transaction, 
  UserAccount, 
  FinancialAccount, 
  FinancialCategory, 
  AccountEntry 
} from '../types';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import { getTodayIsoDate } from '../services/dateService';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  accountEntries: AccountEntry[];
  setAccountEntries: React.Dispatch<React.SetStateAction<AccountEntry[]>>;
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  categories: FinancialCategory[];
  setCategories: React.Dispatch<React.SetStateAction<FinancialCategory[]>>;
  currentUser: UserAccount;
}

const FinancialManager: React.FC<Props> = ({ 
  transactions, 
  setTransactions, 
  accountEntries,
  setAccountEntries,
  accounts,
  setAccounts,
  categories,
  setCategories,
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'realizado' | 'provisionado' | 'relatorios' | 'config'>('provisionado');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entrySearch, setEntrySearch] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'ALL' | 'PAGAR' | 'RECEBER'>('ALL');
  
  const [formData, setFormData] = useState<Partial<AccountEntry>>({
    type: 'PAGAR',
    status: 'PENDENTE',
    dueDate: getTodayIsoDate(),
    amount: 0,
    category: 'Geral',
    description: ''
  });

  const { notify } = useNotify();
  const isAdmin = currentUser.role === 'admin';

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const newEntry: AccountEntry = {
      id: `ENT-${Date.now()}`,
      type: formData.type as 'PAGAR' | 'RECEBER',
      status: 'PENDENTE',
      amount: Number(formData.amount),
      category: formData.category || 'Geral',
      description: formData.description || '',
      dueDate: formData.dueDate || getTodayIsoDate(),
      customerName: formData.customerName,
      supplierName: formData.supplierName,
      installmentNumber: 1,
      totalInstallments: 1
    };

    const newList = [newEntry, ...accountEntries];
    setAccountEntries(newList);
    setShowEntryForm(false);
    setFormData({ type: 'PAGAR', status: 'PENDENTE', dueDate: getTodayIsoDate(), amount: 0, category: 'Geral', description: '' });

    await db.save('serviflow_account_entries', newList, newEntry);
    notify("Lançamento provisionado com sucesso!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAGO': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'ATRASADO': return 'text-rose-500 bg-rose-50 border-rose-100';
      case 'CANCELADO': return 'text-slate-400 bg-slate-50 border-slate-100';
      default: return 'text-amber-500 bg-amber-50 border-amber-100';
    }
  };

  const filteredEntries = accountEntries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(entrySearch.toLowerCase()) || 
                          (entry.customerName?.toLowerCase().includes(entrySearch.toLowerCase())) ||
                          (entry.supplierName?.toLowerCase().includes(entrySearch.toLowerCase()));
    const matchesType = entryTypeFilter === 'ALL' || entry.type === entryTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão Financeira</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Controle profissional de contas a pagar, receber e fluxo de caixa.</p>
        </div>
        {!showEntryForm && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEntryForm(true)}
              className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-700 transition-all font-bold shadow-lg"
            >
              <Plus className="w-4 h-4" /> Novo Lançamento
            </button>
          </div>
        )}
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] self-start mb-8 gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'realizado', label: 'FLUXO DE CAIXA', icon: Wallet },
          { id: 'provisionado', label: 'PAGAR / RECEBER', icon: Calendar },
          { id: 'relatorios', label: 'DRE / RESULTADOS', icon: PieChart },
          { id: 'config', label: 'CONFIGURAÇÕES', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setShowEntryForm(false); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {showEntryForm ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300 max-w-4xl mx-auto">
          {/* ... existing form content ... */}
          <div className="flex items-center justify-between border-b dark:border-slate-700 pb-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest">Novo Lançamento Provisionado</h4>
            <button onClick={() => setShowEntryForm(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>

          <form onSubmit={handleAddEntry} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Tipo de Conta</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'RECEITA' as any })}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${formData.type === 'RECEITA' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                  >
                    A RECEBER
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'PAGAR' as any })}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${formData.type === 'PAGAR' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                  >
                    A PAGAR
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-12 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    value={formData.amount || ''} 
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Vencimento</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  value={formData.dueDate} 
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Descrição / Histórico</label>
                <input 
                  type="text" 
                  placeholder="Ex: Compra de materiais, Aluguel Abril..."
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  value={formData.description || ''} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Categoria</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">
                  {formData.type === 'RECEITA' ? 'Cliente (Opcional)' : 'Fornecedor (Opcional)'}
                </label>
                <input 
                  type="text" 
                  placeholder={formData.type === 'RECEITA' ? 'Nome do Cliente...' : 'Nome do Fornecedor...'}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={formData.type === 'RECEITA' ? (formData.customerName || '') : (formData.supplierName || '')} 
                  onChange={e => formData.type === 'RECEITA' ? setFormData({ ...formData, customerName: e.target.value }) : setFormData({ ...formData, supplierName: e.target.value })} 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-4">
              <button 
                type="button" 
                onClick={() => setShowEntryForm(false)}
                className="px-8 py-3.5 rounded-xl text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-all tracking-widest"
              >
                Descartar
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest"
              >
                Provisionar Lançamento
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'realizado' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Saldo Realizado</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">R$ {(transactions.filter(t => t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO').reduce((a,c)=>a+c.amount,0) - transactions.filter(t=>t.type==='DESPESA').reduce((a,c)=>a+c.amount,0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">Entradas Realizadas</p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">R$ {transactions.filter(t => t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO').reduce((a,c)=>a+c.amount,0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em] mb-2">Saídas Realizadas</p>
              <h3 className="text-2xl font-black text-rose-700 dark:text-rose-400">R$ {transactions.filter(t=>t.type==='DESPESA').reduce((a,c)=>a+c.amount,0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
             <div className="divide-y divide-slate-100 dark:divide-slate-700">
               {transactions.length === 0 ? (
                 <div className="py-20 text-center opacity-40">
                   <Wallet className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhuma transação financeira registrada.</p>
                 </div>
               ) : (
                 transactions.map(t => (
                  <div key={t.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'DESPESA' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {t.type === 'DESPESA' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{t.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                           <span>{t.date.split('-').reverse().join('/')}</span>
                           <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{t.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-lg font-black ${t.type === 'DESPESA' ? 'text-rose-600' : 'text-emerald-600'}`}>
                         {t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                       </p>
                    </div>
                  </div>
                 ))
               )}
             </div>
          </div>
        </div>
      ) : activeTab === 'provisionado' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">R$ {accountEntries.filter(e => e.type === 'PAGAR' && e.status !== 'PAGO').reduce((a,c)=>a+c.amount,0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Receber</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">R$ {accountEntries.filter(e => e.type === 'RECEBER' && e.status !== 'PAGO').reduce((a,c)=>a+c.amount,0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                  <p className="text-xl font-black text-white">R$ {(accountEntries.filter(e => e.type === 'RECEBER' && e.status !== 'PAGO').reduce((a,c)=>a+c.amount,0) - accountEntries.filter(e => e.type === 'PAGAR' && e.status !== 'PAGO').reduce((a,c)=>a+c.amount,0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${entry.type === 'RECEBER' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {entry.type === 'RECEBER' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{entry.description}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getStatusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Venc. {entry.dueDate.split('-').reverse().join('/')}</span>
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {entry.category}</span>
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
                      <p className={`text-xl font-black ${entry.type === 'RECEBER' ? 'text-emerald-600' : 'text-rose-600'} leading-none`}>
                        R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase mt-1 tracking-tighter">{entry.id}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {entry.status === 'PENDENTE' && (
                         <button 
                           onClick={async () => {
                             if (!confirm('Deseja confirmar o pagamento/recebimento deste título?')) return;
                             
                             // 1. Dar baixa no provisionado
                             const updatedEntries = accountEntries.map(e => e.id === entry.id ? { ...e, status: 'PAGO' as any, paymentDate: getTodayIsoDate() } : e);
                             setAccountEntries(updatedEntries);
                             await db.save('serviflow_account_entries', updatedEntries);

                             // 2. Gerar transação real no fluxo de caixa
                             const newTransaction: Transaction = {
                               id: `TR-${Date.now()}`,
                               date: getTodayIsoDate(),
                               amount: entry.amount,
                               type: entry.type === 'RECEBER' ? 'RECEITA' : 'DESPESA',
                               category: entry.category,
                               description: `[BAIXA] ${entry.description}`,
                               entryId: entry.id
                             };

                             const newTransactions = [newTransaction, ...transactions];
                             setTransactions(newTransactions);
                             await db.save('serviflow_transactions', newTransactions, newTransaction);
                             
                             notify(`Lançamento liquidado com sucesso!`);
                           }}
                           className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                           title="Dar Baixa (Receber/Pagar)"
                         >
                           <CheckCircle2 className="w-5 h-5" />
                         </button>
                       )}
                       <button 
                         onClick={async () => {
                           if (!confirm('Deseja excluir este provisionamento?')) return;
                           const newList = accountEntries.filter(e => e.id !== entry.id);
                           setAccountEntries(newList);
                           await db.remove('serviflow_account_entries', entry.id);
                           notify("Provisionamento removido.");
                         }}
                         className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredEntries.length === 0 && (
                <div className="py-20 text-center opacity-40">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum lançamento encontrado para os filtros atuais</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
           <p>Módulo em desenvolvimento...</p>
        </div>
      )}
    </div>
  );
};

export default FinancialManager;
