import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wallet, 
  Calendar, 
  FileText, 
  Settings, 
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  X,
  FileUp,
  TrendingUp,
  Tag
} from 'lucide-react';
import { 
  Transaction, 
  UserAccount, 
  FinancialAccount, 
  FinancialCategory, 
  CategoryNature,
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
  ResponsiveContainer
} from 'recharts';

// Sub-componentes Modulares
import DashboardCards from './financial/DashboardCards';
import EntriesTable from './financial/EntriesTable';
import SettlementModal from './financial/SettlementModal';
import TransactionsHistory from './financial/TransactionsHistory';
import ResultsTab from './financial/ResultsTab';
import SettingsTab from './financial/SettingsTab';

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
  // Estados de Navegação
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'entries' | 'results' | 'settings'>('dashboard');
  const [selectedYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  
  // Estados de Operação
  const [editingEntry, setEditingEntry] = useState<AccountEntry | null>(null);
  const [settlingEntry, setSettlingEntry] = useState<AccountEntry | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'ALL' | 'PAGAR' | 'RECEBER'>('ALL');
  const [printData, setPrintData] = useState<{html: string, title: string, filename: string} | null>(null);
  
  const { notify } = useNotify();

  // Helpers Técnicos
  const isAporte = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.nature === 'APORTE' || cat?.nature === 'EMPRESTIMO' || 
           categoryName?.toLowerCase().includes('aporte') || 
           categoryName?.toLowerCase().includes('emprestimo');
  };

  const getGrowthPercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Base de Dados Unificada (Realizado)
  const allRealized = [
    ...transactions,
    ...accountEntries
      .filter(e => e.status === 'PAGO' && !transactions.some(t => t.entryId === e.id))
      .map(e => ({
        id: e.id,
        date: e.paymentDate || e.dueDate,
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

  // Cálculos de KPI (Mês Atual vs Anterior)
  const currentMonthStr = getTodayIsoDate().substring(0, 7);
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

  const curMonthRealized = allRealized.filter(t => t.date.startsWith(currentMonthStr));
  const prevMonthRealized = allRealized.filter(t => t.date.startsWith(lastMonthStr));

  const curIn = curMonthRealized.filter(t => t.type === 'RECEITA').reduce((a,c)=>a+c.amount, 0);
  const prevIn = prevMonthRealized.filter(t => t.type === 'RECEITA').reduce((a,c)=>a+c.amount, 0);
  const inGrowth = getGrowthPercent(curIn, prevIn);

  const curOut = curMonthRealized.filter(t => t.type === 'DESPESA').reduce((a,c)=>a+c.amount, 0);
  const prevOut = prevMonthRealized.filter(t => t.type === 'DESPESA').reduce((a,c)=>a+c.amount, 0);
  const outGrowth = getGrowthPercent(curOut, prevOut);

  // Dados para Gráfico
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

  // Formulário Inicial
  const initialFormData: Partial<AccountEntry> = {
    type: 'PAGAR',
    status: 'PENDENTE',
    dueDate: getTodayIsoDate(),
    amount: 0,
    category: categories[0]?.name || 'Geral',
    description: ''
  };
  const [formData, setFormData] = useState<Partial<AccountEntry>>(initialFormData);

  // Migração de Naturezas
  useEffect(() => {
    const needsMigration = categories.length > 0 && categories.some(c => !c.nature);
    if (needsMigration) {
      const updated = categories.map(c => {
        if (c.nature) return c;
        let nature: CategoryNature = 'OPERACIONAL';
        if (c.name.toLowerCase().includes('aporte')) nature = 'APORTE';
        else if (c.name.toLowerCase().includes('emprestimo')) nature = 'EMPRESTIMO';
        return { ...c, nature };
      });
      setCategories(updated);
      db.save('serviflow_financial_categories', updated, null);
    }
  }, [categories]);

  // Handlers Principais
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
      attachment: formData.attachment,
      attachmentName: formData.attachmentName
    };

    const newList = [newEntry, ...accountEntries];
    setAccountEntries(newList);
    await db.save('serviflow_account_entries', newList, newEntry);

    if (isInvestment) {
      const newTransaction: Transaction = {
        id: `TR-INV-${Date.now()}`,
        date: getTodayIsoDate(),
        amount: Number(formData.amount),
        type: 'RECEITA',
        category: formData.category || 'Aporte de Sócios',
        description: formData.description || 'Aporte de Capital',
        entryId: newEntry.id
      };
      setTransactions([newTransaction, ...transactions]);
      await db.save('serviflow_transactions', [newTransaction, ...transactions], newTransaction);
    }

    setShowForm(false);
    setFormData(initialFormData);
    notify(isInvestment ? "Aporte registrado com sucesso!" : "Lançamento provisionado!");
  };

  const filteredEntries = accountEntries.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(entrySearch.toLowerCase()) || 
                          e.customerName?.toLowerCase().includes(entrySearch.toLowerCase()) ||
                          e.supplierName?.toLowerCase().includes(entrySearch.toLowerCase());
    const matchesType = entryTypeFilter === 'ALL' || e.type === entryTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Profissional */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão Financeira</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Controle profissional de faturamento, despesas e fluxo de caixa.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg"
          >
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] self-start mb-8 gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'DASHBOARD', icon: PieChart },
          { id: 'history', label: 'FLUXO DE CAIXA', icon: Wallet },
          { id: 'entries', label: 'PAGAR / RECEBER', icon: Calendar },
          { id: 'results', label: 'DRE / RESULTADOS', icon: FileText },
          { id: 'settings', label: 'CONFIGURAÇÕES', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setShowForm(false); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Renderização de Abas Modulares */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-8">
              <DashboardCards 
                curIn={curIn}
                inGrowth={inGrowth}
                curOut={curOut}
                outGrowth={outGrowth}
                totalReceivable={accountEntries.filter(e => e.type === 'RECEBER' && e.status !== 'PAGO').reduce((a,c)=>a+c.amount, 0)}
                totalPayable={accountEntries.filter(e => e.type === 'PAGAR' && e.status !== 'PAGO').reduce((a,c)=>a+c.amount, 0)}
                onCardClick={(type) => {
                  if (type === 'APORTE') {
                    const cat = categories.find(c => isAporte(c.name))?.name || 'Aporte de Sócios';
                    setFormData({ ...initialFormData, type: 'INVESTIMENTO', category: cat });
                  } else setFormData({ ...initialFormData, type: type as any });
                  setShowForm(true);
                }}
              />
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Fluxo Mensal ({selectedYear})</h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                      <Bar dataKey="ent" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="sai" name="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:w-72 space-y-5">
              <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl">
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Saldos em Bancos</h4>
                <div className="space-y-3">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase">{acc.name}</span>
                      <span className="text-[11px] font-black italic">R$ {acc.currentBalance.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('settings')} className="w-full py-2 mt-2 bg-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-white/20">Configurar Contas</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'entries' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 mb-6">
            <div className="flex-1 relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Filtrar lançamentos..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl py-3 pl-12 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                value={entrySearch} onChange={e => setEntrySearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {['ALL', 'RECEBER', 'PAGAR'].map(f => (
                <button key={f} onClick={() => setEntryTypeFilter(f as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryTypeFilter === f ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>{f}</button>
              ))}
            </div>
          </div>
          <EntriesTable 
            entries={filteredEntries} accounts={accounts}
            onSettle={(e) => setSettlingEntry(e)}
            onDelete={async (id) => {
              if(!confirm("Excluir provisão?")) return;
              const newList = accountEntries.filter(e => e.id !== id);
              setAccountEntries(newList);
              await db.remove('serviflow_account_entries', id);
              notify("Removido.");
            }}
            onViewAttachment={(e) => window.open(e.attachment, '_blank')}
          />
        </div>
      ) : activeTab === 'history' ? (
        <TransactionsHistory 
          transactions={transactions} searchQuery={historySearch} setSearchQuery={setHistorySearch}
          onDelete={async (id) => {
            if(!confirm("Excluir registro histórico? (Isso não altera o saldo atual)")) return;
            const newList = transactions.filter(t => t.id !== id);
            setTransactions(newList);
            await db.remove('serviflow_transactions', id);
            notify("Excluído.");
          }}
          onViewAttachment={(t) => window.open(t.attachment, '_blank')}
          onExport={() => setPrintData({
            html: buildFinancialReportHtml(transactions, accountEntries, accounts, categories, company, 'REALIZADO'),
            title: 'Extrato de Caixa', filename: `EXTRATO_${getTodayIsoDate()}`
          })}
        />
      ) : activeTab === 'results' ? (
        <ResultsTab 
          categories={categories} allRealized={allRealized} 
          accountEntries={accountEntries} selectedYear={selectedYear} isAporte={isAporte} 
        />
      ) : (
        <SettingsTab 
          accounts={accounts} categories={categories}
          onAddAccount={async () => {
             const name = prompt("Nome da conta:"); if(!name) return;
             const balance = Number(prompt("Saldo inicial:", "0"));
             const newAcc: FinancialAccount = { id: `ACC-${Date.now()}`, name, initialBalance: balance, currentBalance: balance };
             setAccounts([...accounts, newAcc]);
             await db.save('serviflow_financial_accounts', [...accounts, newAcc], newAcc);
          }}
          onDeleteAccount={async (id) => {
            if(!confirm("Excluir conta?")) return;
            const newList = accounts.filter(a => a.id !== id);
            setAccounts(newList);
            await db.remove('serviflow_financial_accounts', id);
          }}
          onAddCategory={async () => {
            const name = prompt("Nome da categoria:"); if(!name) return;
            const res = confirm("OK para Receita, Cancel para Despesa");
            const natureInput = prompt("Natureza (OPERACIONAL/APORTE/EMPRESTIMO/IMPOSTO/TRANSFERENCIA):", "OPERACIONAL")?.toUpperCase();
            const newCat: FinancialCategory = { 
              id: `CAT-${Date.now()}`, 
              name, 
              type: res ? 'RECEITA' : 'DESPESA',
              nature: natureInput as any
            };
            setCategories([...categories, newCat]);
            await db.save('serviflow_financial_categories', [...categories, newCat], newCat);
          }}
          onDeleteCategory={async (id) => {
             if(!confirm("Excluir categoria?")) return;
             const newList = categories.filter(c => c.id !== id);
             setCategories(newList);
             await db.remove('serviflow_financial_categories', id);
          }}
        />
      )}

      {/* Formulário de Novo Lançamento */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 text-slate-400 hover:text-rose-500 transition-colors">
              <X className="w-8 h-8" />
            </button>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-8">Novo Lançamento</h3>
            
            <form onSubmit={handleAddEntry} className="space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Operação</label>
                     <div className="grid grid-cols-3 gap-3">
                        {['RECEITA', 'PAGAR', 'INVESTIMENTO'].map(t => (
                          <button key={t} type="button" onClick={() => setFormData({...formData, type: t as any})} className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.type === t ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}>
                            {t === 'INVESTIMENTO' ? 'Aporte' : t === 'PAGAR' ? 'Despesa' : 'Receita'}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descrição</label>
                     <input type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Pagamento Fornecedor X" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor (R$)</label>
                     <input type="number" step="0.01" required value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Vencimento</label>
                     <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoria</label>
                     <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 uppercase">
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                  </div>
               </div>
               <button type="submit" className="w-full py-5 mt-4 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]">Confirmar e Gravar</button>
            </form>
          </div>
        </div>
      )}

      {/* Modais de Fluxo */}
      <SettlementModal 
        entry={settlingEntry} accounts={accounts} onClose={() => setSettlingEntry(null)}
        onConfirm={async (entryId, accountId) => {
          const entry = accountEntries.find(e => e.id === entryId);
          const selectedAccount = accounts.find(a => a.id === accountId);
          if (entry && selectedAccount) {
            const amount = entry.amount;
            const isIncoming = entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO';
            
            const updatedAccounts = accounts.map(acc => {
              if (acc.id === selectedAccount.id) return { ...acc, currentBalance: isIncoming ? acc.currentBalance + amount : acc.currentBalance - amount };
              return acc;
            });
            setAccounts(updatedAccounts);
            db.save('serviflow_financial_accounts', updatedAccounts, null);

            const newTransaction: Transaction = {
              id: `TR-${Date.now()}`, date: getTodayIsoDate(), amount, 
              type: isIncoming ? 'RECEITA' : 'DESPESA', category: entry.category,
              description: `[BAIXA] ${entry.description}`, entryId: entry.id,
              customerName: entry.customerName, supplierName: entry.supplierName
            };
            setTransactions([newTransaction, ...transactions]);
            db.save('serviflow_transactions', [newTransaction, ...transactions], newTransaction);

            const newList = accountEntries.map(e => e.id === entry.id ? { ...e, status: 'PAGO' as any, paymentDate: getTodayIsoDate(), accountId: selectedAccount.id } : e);
            setAccountEntries(newList);
            db.save('serviflow_account_entries', newList, { ...entry, status: 'PAGO' as any, paymentDate: getTodayIsoDate(), accountId: selectedAccount.id });
            
            setSettlingEntry(null);
            notify(`Baixa concluída!`);
          }
        }}
      />

      {editingEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           {/* Modal de Edição (Placeholder para simplificar fragmentação) */}
           <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl">
              <h4 className="font-black uppercase tracking-widest text-slate-400 mb-4">Edição não disponível nesta versão modularizada</h4>
              <button onClick={() => setEditingEntry(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl uppercase font-black text-[10px]">Fechar</button>
           </div>
        </div>
      )}

      {printData && <ReportPreview html={printData.html} title={printData.title} filename={printData.filename} onClose={() => setPrintData(null)} />}
    </div>
  );
};

export default FinancialManager;
