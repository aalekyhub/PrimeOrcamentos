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
  X,
  Coins
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'realizado' | 'provisionado' | 'relatorios' | 'config'>('dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entrySearch, setEntrySearch] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'ALL' | 'PAGAR' | 'RECEBER'>('ALL');

  const initialFormData: Partial<AccountEntry> = {
    type: 'PAGAR',
    status: 'PENDENTE',
    dueDate: getTodayIsoDate(),
    amount: 0,
    category: 'Geral',
    description: '',
    attachment: undefined,
    attachmentName: undefined
  };

  const [formData, setFormData] = useState<Partial<AccountEntry>>(initialFormData);

  const [editingItem, setEditingItem] = useState<AccountEntry | Transaction | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{ content: string, name: string } | null>(null);
  const [printData, setPrintData] = useState<{ html: string, title: string, filename: string } | null>(null);
  const { notify } = useNotify();

  const isAporte = (category: string) =>
    category?.toLowerCase().includes('aporte') ||
    category?.toLowerCase().includes('emprestimo') ||
    category?.toLowerCase().includes('empréstimo');

  const allRealized = [
    ...transactions,
    ...accountEntries
      .filter(e => e.status === 'PAGO' && !transactions.some(t => t.entryId === e.id))
      .map(e => ({
        id: e.id,
        date: e.paymentDate || e.dueDate,
        dueDate: e.dueDate,
        amount: e.amount,
        type: (e.type === 'RECEBER' || e.type === 'INVESTIMENTO') ? 'RECEITA' : 'DESPESA' as any,
        category: e.category,
        description: e.description,
        isFromEntry: true,
        customerName: e.customerName,
        supplierName: e.supplierName,
        attachment: e.attachment,
        attachmentName: e.attachmentName
      }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const monthsKeys = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = monthsKeys.map((name, index) => {
    const monthIso = String(index + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthIso}`;
    const monthEntries = allRealized.filter(t => t.date.startsWith(monthPrefix));
    return {
      name,
      ent: monthEntries.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.amount, 0),
      sai: monthEntries.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.amount, 0)
    };
  });

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

    const isInvestment = formData.type === 'INVESTIMENTO';

    const newEntry: AccountEntry = {
      id: `ENT-${Date.now()}`,
      type: formData.type as any,
      status: isInvestment ? 'PAGO' : 'PENDENTE',
      amount: Number(formData.amount),
      category: formData.category || 'Geral',
      description: formData.description || '',
      dueDate: formData.dueDate || getTodayIsoDate(),
      paymentDate: isInvestment ? getTodayIsoDate() : undefined,
      customerName: formData.customerName,
      supplierName: formData.supplierName,
      installmentNumber: 1,
      totalInstallments: 1,
      attachment: formData.attachment,
      attachmentName: formData.attachmentName
    };

    const newList = [newEntry, ...accountEntries];
    setAccountEntries(newList);

    if (isInvestment) {
      const newTransaction: Transaction = {
        id: `TR-INV-${Date.now()}`,
        date: getTodayIsoDate(),
        amount: Number(formData.amount),
        type: 'RECEITA',
        category: formData.category || 'Aporte de Sócios',
        description: formData.description || 'Empréstimo',
        entryId: newEntry.id,
        customerName: formData.customerName,
        supplierName: formData.supplierName
      };
      const newTransactions = [newTransaction, ...transactions];
      setTransactions(newTransactions);
      await db.save('serviflow_transactions', newTransactions, newTransaction);
    }

    setShowEntryForm(false);
    setFormData(initialFormData);

    await db.save('serviflow_account_entries', newList, newEntry);
    notify(isInvestment ? "Empréstimo registrado e caixa atualizado!" : "Lançamento provisionado com sucesso!");
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const isAccEntry = editingItem.id.startsWith('ENT-') || 'dueDate' in editingItem;

    if (isAccEntry) {
      const mappedType = editingItem.type === 'RECEITA' ? 'RECEBER' : 
                         editingItem.type === 'DESPESA' ? 'PAGAR' : 
                         editingItem.type;
      const updatedEntry = { ...editingItem, type: mappedType } as AccountEntry;
      const newList = accountEntries.map(e => e.id === editingItem.id ? updatedEntry : e);
      setAccountEntries(newList);
      await db.save('serviflow_account_entries', newList, updatedEntry);
    } else {
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
          { id: 'dashboard', label: 'DASHBOARD', icon: PieChart },
          { id: 'realizado', label: 'FLUXO DE CAIXA', icon: Wallet },
          { id: 'provisionado', label: 'PAGAR / RECEBER', icon: Calendar },
          { id: 'relatorios', label: 'DRE / RESULTADOS', icon: FileText },
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

      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Dash Area */}
            <div className="flex-1 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Dashboard Executivo</h3>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Faturamento Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">1. Faturamento (Vendas)</p>
                      <h4 className="text-xl font-black text-emerald-600">
                        R$ {allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Recebimento Operacional</p>
                  </div>
                </div>

                {/* 2. Despesas Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">2. Despesas (Operacional)</p>
                      <h4 className="text-xl font-black text-rose-600">
                        R$ {allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
                      <ArrowDownLeft className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Saídas da Operação</p>
                  </div>
                </div>

                {/* 3. Resultado Operacional Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">3. Resultado Operacional</p>
                      {(() => {
                        const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                        const des = allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
                        const res = fat - des;
                        return (
                          <h4 className={`text-xl font-black ${res >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {res.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h4>
                        );
                      })()}
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 text-slate-600 rounded-2xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Sobrevivência da Operação</p>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      {(() => {
                        const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                        const des = allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
                        const perc = fat > 0 ? Math.min(100, (fat / (des || 1)) * 100) : 0;
                        return (
                          <div 
                            className={`h-full transition-all duration-1000 ${perc >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                            style={{ width: `${perc}%` }}
                          ></div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 4. Aportes Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">4. Aportes (Sócios)</p>
                      <h4 className="text-xl font-black text-indigo-600">
                        R$ {allRealized.filter(t => isAporte(t.category)).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                      <Coins className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Capital dos Sócios
                    </div>
                  </div>
                </div>

                {/* 5. Saldo Final Card */}
                <div className="bg-slate-900 dark:bg-slate-700 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-white/50">5. Saldo Final de Caixa</p>
                      {(() => {
                        const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                        const des = allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
                        const apor = allRealized.filter(t => isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                        const saldo = (fat - des) + apor;
                        return (
                          <h4 className={`text-xl font-black ${saldo >= 0 ? 'text-white' : 'text-rose-400'}`}>
                            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h4>
                        );
                      })()}
                    </div>
                    <div className="p-3 bg-white/10 text-white rounded-2xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-[9px] font-bold text-white/40 uppercase">Acompanhamento Profissional</p>
                  </div>
                </div>
              </div>

              {/* Fluxo Mensal Chart */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Fluxo de Caixa Mensal ({selectedYear})</h4>
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Bar dataKey="ent" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="sai" name="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Side Panel: Banks & Top Expenses */}
            <div className="lg:w-72 space-y-5">
              {/* Saldo em Bancos Sidebar */}
              <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Saldo em Bancos</h4>
                  <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-3 h-3" />
                  </div>
                </div>
                <div className="mb-5">
                  <p className="text-2xl font-black">R$ {accounts.reduce((a, c) => a + c.currentBalance, 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[8px] text-emerald-400 font-bold mt-0.5 uppercase">Saldo Consolidado</p>
                </div>
                <div className="space-y-2">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-black text-[8px]">
                          {acc.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold uppercase">{acc.name}</span>
                      </div>
                      <span className="text-[10px] font-black">R$ {acc.currentBalance.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab('config')}
                    className="w-full py-2 border border-white/10 rounded-xl text-[8px] font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase"
                  >
                    Gerenciar Contas
                  </button>
                </div>
              </div>

              {/* Top Expenses */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Maiores Despesas</h4>
                <div className="space-y-4">
                  {categories.filter(c => c.type === 'DESPESA')
                    .map(cat => ({
                      name: cat.name,
                      value: transactions.filter(t => t.category === cat.name && t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0)
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-1.5">
                          <span>{item.name}</span>
                          <span className="text-slate-900 dark:text-white">R$ {item.value.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (item.value / Math.max(1, transactions.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showEntryForm ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b dark:border-slate-700 pb-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest">Novo Lançamento Provisionado</h4>
            <button onClick={() => setShowEntryForm(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>

          <form onSubmit={handleAddEntry} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Tipo de Lançamento</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'RECEITA' as any })}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter ${formData.type === 'RECEITA' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                  >
                    A RECEBER
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'PAGAR' as any })}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter ${formData.type === 'PAGAR' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                  >
                    A PAGAR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const aporteCat = categories.find(c => isAporte(c.name))?.name || 'Aporte de Sócios';
                      setFormData({ ...formData, type: 'INVESTIMENTO' as any, category: aporteCat });
                      notify("Tipo Investimento: Categoria ajustada automaticamente.");
                    }}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter ${formData.type === 'INVESTIMENTO' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                  >
                    EMPRÉSTIMO
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
                  onChange={e => {
                    const newCatName = e.target.value;
                    const catObj = categories.find(c => c.name === newCatName);
                    const isContribution = isAporte(newCatName);
                    
                    let newType = formData.type;
                    if (isContribution) {
                      newType = 'INVESTIMENTO' as any;
                    } else if (catObj) {
                      newType = catObj.type === 'RECEITA' ? 'RECEBER' as any : 'PAGAR' as any;
                    }

                    setFormData({
                      ...formData,
                      category: newCatName,
                      type: newType
                    });
                    
                    if (isContribution) notify("Categoria de Aporte: Tipo ajustado para Empréstimo.");
                    else if (catObj) notify(`Tipo ajustado para ${catObj.type === 'RECEITA' ? 'A Receber' : 'A Pagar'} baseado na categoria.`);
                  }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">
                  {formData.type === 'INVESTIMENTO' ? 'Sócio / Origem (Opcional)' : formData.type === 'RECEITA' ? 'Cliente (Opcional)' : 'Fornecedor (Opcional)'}
                </label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder={formData.type === 'INVESTIMENTO' ? 'Nome do Sócio ou Origem...' : formData.type === 'RECEITA' ? 'Nome do Cliente...' : 'Nome do Fornecedor...'}
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={formData.type === 'RECEITA' ? (formData.customerName || '') : (formData.supplierName || '')}
                    onChange={e => formData.type === 'RECEITA' ? setFormData({ ...formData, customerName: e.target.value }) : setFormData({ ...formData, supplierName: e.target.value })}
                  />
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e)}
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
                {formData.type === 'INVESTIMENTO' ? 'Registrar Empréstimo' : 'Provisionar Lançamento'}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'realizado' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Faturamento */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">1. Faturamento (Vendas)</p>
              <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400">R$ {allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            {/* 2. Despesas */}
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
              <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">2. Despesas (Operacional)</p>
              <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">R$ {allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            {/* 3. Resultado Operacional */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">3. Resultado Operacional</p>
              {(() => {
                const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                const des = allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
                const res = fat - des;
                return (
                  <h3 className={`text-xl font-black ${res >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    R$ {res.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                );
              })()}
            </div>
            {/* 4. Aportes */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">4. Aportes (Sócios)</p>
              <h3 className="text-xl font-black text-indigo-700 dark:text-indigo-400">R$ {allRealized.filter(t => isAporte(t.category)).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            {/* 5. Saldo Final */}
            <div className="bg-slate-900 dark:bg-slate-700 p-4 rounded-2xl text-white shadow-lg flex flex-col justify-between">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">5. Saldo Final de Caixa</p>
              {(() => {
                const fat = allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                const des = allRealized.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
                const apor = allRealized.filter(t => isAporte(t.category)).reduce((a, c) => a + c.amount, 0);
                const saldo = (fat - des) + apor;
                return (
                  <h3 className={`text-xl font-black ${saldo >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                );
              })()}
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
      ) : activeTab === 'provisionado' ? (
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
                            onClick={async () => {
                              if (!confirm('Deseja confirmar o pagamento/recebimento deste título?')) return;
                              const updatedEntries = accountEntries.map(e => e.id === entry.id ? { ...e, status: 'PAGO' as any, paymentDate: getTodayIsoDate() } : e);
                              setAccountEntries(updatedEntries);
                              await db.save('serviflow_account_entries', updatedEntries);
                              const newTransaction: Transaction = {
                                id: `TR-${Date.now()}`,
                                date: getTodayIsoDate(),
                                amount: entry.amount,
                                type: (entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO') ? 'RECEITA' : 'DESPESA',
                                category: entry.category,
                                description: `[BAIXA] ${entry.description}`,
                                entryId: entry.id,
                                customerName: entry.customerName,
                                supplierName: entry.supplierName
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
                );
              })}
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
                  const total = allRealized.filter(t => t.category === cat.name && t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
                  const grandTotal = allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
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
                  const total = allRealized.filter(t => t.category === cat.name && t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
                  const grandTotal = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0);
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
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Resultado do Período (Entradas vs Despesas)</h4>
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                <p className="text-4xl font-black">
                  R$ {(
                    allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) -
                    allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                    VENDAS: R$ {allRealized.filter(t => t.type === 'RECEITA' && !isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">
                    DESPESAS: R$ {allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                    APORTES: R$ {allRealized.filter(t => isAporte(t.category) && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Índice de Sobra</p>
                <p className="text-2xl font-black">
                  {allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) > 0
                    ? (((allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0) - allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)) / allRealized.filter(t => t.type === 'RECEITA' && t.date.startsWith(selectedYear.toString())).reduce((a, c) => a + c.amount, 0)) * 100).toFixed(1)
                    : '0'
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Viewer Modal */}
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

      {/* Edit Modal */}
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tipo de Lançamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, type: 'RECEITA' } as any)}
                      className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase ${editingItem.type === 'RECEITA' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      ENTRADA
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, type: 'DESPESA' } as any)}
                      className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase ${editingItem.type === 'DESPESA' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      SAÍDA
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold"
                    value={editingItem.amount}
                    onChange={e => setEditingItem({ ...editingItem, amount: Number(e.target.value) } as any)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Categoria</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold"
                    value={editingItem.category}
                    onChange={e => {
                      const newCatName = e.target.value;
                      const catObj = categories.find(c => c.name === newCatName);
                      const isContribution = isAporte(newCatName);
                      
                      let newType = editingItem.type;
                      if (isContribution) {
                        newType = 'INVESTIMENTO' as any;
                      } else if (catObj) {
                        newType = catObj.type === 'RECEITA' ? 'RECEBER' as any : 'PAGAR' as any;
                      }

                      setEditingItem({
                        ...editingItem,
                        category: newCatName,
                        type: newType
                      } as any);
                    }}
                  >
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Descrição</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold"
                    value={editingItem.description}
                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value } as any)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input type="file" id="edit-file" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                  <label htmlFor="edit-file" className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all">
                    <FileUp className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-black text-slate-400 uppercase">
                      {editingItem.attachment ? 'Alterar Anexo' : 'Adicionar Anexo'}
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
