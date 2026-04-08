
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
  ChevronRight,
  Filter,
  DollarSign,
  FileUp,
  Paperclip,
  Download,
  Eye,
  Pencil,
  X
} from 'lucide-react';
import { 
  Transaction, 
  UserAccount, 
  FinancialAccount, 
  FinancialCategory, 
  AccountEntry,
  CompanyProfile
} from '../types';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import { getTodayIsoDate } from '../services/dateService';
import ReportPreview from './ReportPreview';
import { buildFinancialReportHtml } from '../services/financialPdfService';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  accountEntries: AccountEntry[];
  setAccountEntries: React.Dispatch<React.SetStateAction<AccountEntry[]>>;
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  categories: FinancialCategory[];
  setCategories: React.Dispatch<React.SetStateAction<FinancialCategory[]>>;
  company: CompanyProfile;
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
  company,
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
    description: '',
    attachment: undefined,
    attachmentName: undefined
  });

  const [editingItem, setEditingItem] = useState<AccountEntry | Transaction | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{content: string, name: string} | null>(null);
  const [printData, setPrintData] = useState<{html: string, title: string, filename: string} | null>(null);

  const { notify } = useNotify();
  const isAdmin = currentUser.role === 'admin';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEditing && editingItem) {
        setEditingItem({ ...editingItem, attachment: base64, attachmentName: file.name } as any);
      } else {
        setFormData({ ...formData, attachment: base64, attachmentName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

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
      totalInstallments: 1,
      attachment: formData.attachment,
      attachmentName: formData.attachmentName
    };

    const newList = [newEntry, ...accountEntries];
    setAccountEntries(newList);
    setShowEntryForm(false);
    setFormData({ type: 'PAGAR', status: 'PENDENTE', dueDate: getTodayIsoDate(), amount: 0, category: 'Geral', description: '' });

    await db.save('serviflow_account_entries', newList, newEntry);
    notify("Lançamento provisionado com sucesso!");
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if ('dueDate' in editingItem) {
      // It's an AccountEntry
      const newList = accountEntries.map(e => e.id === editingItem.id ? (editingItem as AccountEntry) : e);
      setAccountEntries(newList);
      await db.save('serviflow_account_entries', newList, editingItem as AccountEntry);
    } else {
      // It's a Transaction
      const newList = transactions.map(t => t.id === editingItem.id ? (editingItem as Transaction) : t);
      setTransactions(newList);
      await db.save('serviflow_transactions', newList, editingItem as Transaction);
    }
    
    setEditingItem(null);
    notify("Alterações salvas!");
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
                           <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">
                  {formData.type === 'RECEITA' ? 'Cliente (Opcional)' : 'Fornecedor (Opcional)'}
                </label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder={formData.type === 'RECEITA' ? 'Nome do Cliente...' : 'Nome do Fornecedor...'}
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={formData.type === 'RECEITA' ? (formData.customerName || '') : (formData.supplierName || '')} 
                    onChange={e => formData.type === 'RECEITA' ? setFormData({ ...formData, customerName: e.target.value }) : setFormData({ ...formData, supplierName: e.target.value })} 
                  />
                  <div className="relative">
                    <input 
                      type="file" 
                      id="file-upload"
                      className="hidden" 
                      onChange={handleFileUpload}
                      accept="image/*,application/pdf"
                    />
                    <label 
                      htmlFor="file-upload"
                      className={`h-full px-4 rounded-xl flex items-center gap-2 cursor-pointer transition-all border-2 border-dashed ${formData.attachment ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300'}`}
                    >
                      <FileUp className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase">
                        {formData.attachment ? 'Arquivo Pronto' : 'Anexo'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
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
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setPrintData({
                  html: buildFinancialReportHtml(transactions, accountEntries, accounts, categories, company, 'EXTRATO', 'Geral'),
                  title: 'Extrato de Fluxo de Caixa',
                  filename: `EXTRATO_FINANCEIRO_${getTodayIsoDate()}`
                })}
                className="flex-1 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all text-xs font-black uppercase tracking-widest"
              >
                <Download className="w-4 h-4" /> Exportar Extrato
              </button>
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
                    <div key={t.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'DESPESA' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {t.type === 'DESPESA' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{t.description}</p>
                            {t.attachment && (
                              <button 
                                onClick={() => setViewingAttachment({ content: t.attachment!, name: t.attachmentName || 'Anexo' })}
                                className="text-blue-400 hover:text-blue-600"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                             <span>{t.date.split('-').reverse().join('/')}</span>
                             <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{t.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className={`text-lg font-black ${t.type === 'DESPESA' ? 'text-rose-600' : 'text-emerald-600'}`}>
                             {t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => setEditingItem(t)} className="p-2 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-blue-50">
                             <Pencil className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={async () => {
                               if(!confirm("Excluir esta transação? Isso afetará o saldo da conta.")) return;
                               const newList = transactions.filter(item => item.id !== t.id);
                               setTransactions(newList);
                               await db.remove('serviflow_transactions', t.id);
                               notify("Transação excluída.");
                             }}
                             className="p-2 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
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
              {filteredEntries.map(entry => (
                <div key={entry.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${entry.type === 'RECEBER' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {entry.type === 'RECEBER' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
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
      ) : activeTab === 'relatorios' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Distribuição de Receitas
              </h4>
              <div className="space-y-4">
                {categories.filter(c => c.type === 'RECEITA').map(cat => {
                  const total = transactions.filter(t => t.category === cat.name && t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0);
                  const grandTotal = transactions.filter(t => t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0);
                  const percent = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                  
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-xs font-bold mb-1 uppercase">
                        <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                        <span className="text-slate-900 dark:text-white">R$ {total.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Distribuição de Despesas
              </h4>
              <div className="space-y-4">
                {categories.filter(c => c.type === 'DESPESA').map(cat => {
                  const total = transactions.filter(t => t.category === cat.name && t.type === 'DESPESA').reduce((a,c) => a + c.amount, 0);
                  const grandTotal = transactions.filter(t => t.type === 'DESPESA').reduce((a,c) => a + c.amount, 0);
                  const percent = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                  
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-xs font-bold mb-1 uppercase">
                        <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                        <span className="text-slate-900 dark:text-white">R$ {total.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Resultado Operacional</h4>
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                <p className="text-4xl font-black">
                  R$ {(transactions.filter(t => t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0) - transactions.filter(t => t.type === 'DESPESA').reduce((a,c) => a + c.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                    RECEITA: R$ {transactions.filter(t => t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">
                    DESPESA: R$ {transactions.filter(t => t.type === 'DESPESA').reduce((a,c) => a + c.amount, 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Margem de Lucro</p>
                <p className="text-2xl font-black">
                  {transactions.filter(t => t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0) > 0 
                    ? (((transactions.filter(t => t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0) - transactions.filter(t => t.type === 'DESPESA').reduce((a,c) => a + c.amount, 0)) / transactions.filter(t => t.type === 'RECEITA').reduce((a,c) => a + c.amount, 0)) * 100).toFixed(1)
                    : '0'
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Categorias Management */}
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
                      if(!confirm("Excluir esta categoria?")) return;
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
              {categories.length === 0 && (
                 <button 
                  onClick={async () => {
                    const defaults: FinancialCategory[] = [
                      { id: 'CAT-001', name: 'Venda de Serviços', type: 'RECEITA' },
                      { id: 'CAT-002', name: 'Aporte de Sócios', type: 'RECEITA' },
                      { id: 'CAT-003', name: 'Materiais', type: 'DESPESA' },
                      { id: 'CAT-004', name: 'Mão de Obra', type: 'DESPESA' },
                      { id: 'CAT-005', name: 'Aluguel', type: 'DESPESA' },
                      { id: 'CAT-006', name: 'Geral', type: 'DESPESA' },
                    ];
                    setCategories(defaults);
                    await db.save('serviflow_financial_categories', defaults);
                    notify("Categorias padrão carregadas!");
                  }}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all uppercase"
                >
                  Carregar Categorias Padrão
                </button>
              )}
            </div>
          </div>

          {/* Accounts Management */}
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
                       if(!confirm("Remover esta conta?")) return;
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
              {accounts.length === 0 && (
                <div className="text-center py-10 opacity-30 italic text-sm">Nenhuma conta cadastrada.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modular */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <Paperclip className="text-blue-500" />
                <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-widest text-sm">{viewingAttachment.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={viewingAttachment.content} 
                  download={viewingAttachment.name}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 text-xs font-bold uppercase"
                >
                  <Download className="w-4 h-4" /> Baixar
                </a>
                <button onClick={() => setViewingAttachment(null)} className="p-2 text-slate-400 hover:text-rose-500">
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-black p-8 flex items-center justify-center">
              {viewingAttachment.content.startsWith('data:image/') ? (
                <img src={viewingAttachment.content} alt="Anexo" className="max-w-full h-auto rounded-lg shadow-lg" />
              ) : (
                <iframe src={viewingAttachment.content} className="w-full h-full min-h-[600px] border-none rounded-lg" title="Documento" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative">
            <button onClick={() => setEditingItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500">
              <X className="w-8 h-8" />
            </button>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
              <Pencil className="text-blue-500" /> Editar Lançamento
            </h3>
            
            <form onSubmit={handleUpdateItem} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={editingItem.description}
                      onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={editingItem.amount}
                      onChange={e => setEditingItem({ ...editingItem, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={editingItem.category}
                      onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
               </div>

               <div className="flex gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      id="edit-file-upload"
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, true)}
                      accept="image/*,application/pdf"
                    />
                    <label 
                      htmlFor="edit-file-upload"
                      className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all ${editingItem.attachment ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300'}`}
                    >
                      <FileUp className="w-5 h-5" />
                      <span className="text-xs font-black uppercase">
                        {editingItem.attachment ? 'Substituir Anexo' : 'Adicionar Anexo'}
                      </span>
                    </label>
                  </div>
                  <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-all">
                    Salvar Alterações
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {printData && (
        <ReportPreview 
          htmlContent={printData.html}
          title={printData.title}
          filename={printData.filename}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
};

export default FinancialManager;
