
import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Calendar, Tag, Trash2, Paperclip, ChevronLeft, ChevronRight, Download, Eye, FileText, Pencil } from 'lucide-react';
import { Transaction, UserAccount, RecurrenceFrequency, Loan } from '../types';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import { getTodayIsoDate } from '../services/dateService';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  currentUser: UserAccount;
}

const FinancialControl: React.FC<Props> = ({ transactions, setTransactions, loans, setLoans, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'recorrencia' | 'emprestimos' | 'historico'>('geral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { notify } = useNotify();
  const isAdmin = currentUser.role === 'admin';
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'RECEITA',
    date: getTodayIsoDate(),
    isRecurring: false,
    frequency: 'NONE'
  });

  const [loanFormData, setLoanFormData] = useState<Partial<Loan>>({
    bankName: '',
    totalAmount: 0,
    installmentsCount: 1,
    installmentValue: 0,
    startDate: getTodayIsoDate()
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          attachment: reader.result as string,
          attachmentName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const today = getTodayIsoDate();
  const realizedTransactions = transactions.filter(t => t.date <= today);

  const totalIncome = realizedTransactions.filter(t => t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO').reduce((s, t) => s + t.amount, 0);
  const totalExpense = realizedTransactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);

  const projectedIncome = transactions.filter(t => t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO').reduce((s, t) => s + t.amount, 0);
  const projectedExpense = transactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);
  const projectedBalance = projectedIncome - projectedExpense;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !isAdmin) {
      notify("Você não tem permissão para editar lançamentos.", "error");
      return;
    }
    if (!formData.amount || !formData.category) return;

    const newT: Transaction = {
      id: editingId || `T-${Date.now()}`,
      amount: Number(formData.amount),
      category: formData.category || 'Geral',
      date: formData.date || getTodayIsoDate(),
      type: formData.type as 'RECEITA' | 'DESPESA' | 'EMPRESTIMO_SOCIO',
      description: formData.description || '',
      isRecurring: formData.isRecurring,
      frequency: formData.frequency,
      attachment: formData.attachment,
      attachmentName: formData.attachmentName
    };

    let newList: Transaction[];
    if (editingId) {
      newList = transactions.map(t => t.id === editingId ? newT : t);
    } else {
      newList = [newT, ...transactions];
    }
    
    setTransactions(newList);
    setShowForm(false);
    setEditingId(null);
    setFormData({ type: 'RECEITA', date: getTodayIsoDate(), isRecurring: false, frequency: 'NONE' });

    const result = await db.save('serviflow_transactions', newList, newT);
    if (result?.success) notify(editingId ? "Transação atualizada!" : "Transação lançada!");
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanFormData.bankName || !loanFormData.totalAmount || !loanFormData.installmentValue) return;

    const newLoan: Loan = {
      id: `LOAN-${Date.now()}`,
      bankName: loanFormData.bankName!,
      totalAmount: Number(loanFormData.totalAmount),
      remainingAmount: Number(loanFormData.totalAmount),
      startDate: loanFormData.startDate!,
      installmentsCount: Number(loanFormData.installmentsCount),
      installmentsPaid: 0,
      installmentValue: Number(loanFormData.installmentValue),
      interestRate: Number(loanFormData.interestRate || 0),
      description: loanFormData.description || ''
    };

    const newList = [newLoan, ...loans];
    setLoans(newList);
    setShowForm(false);
    setLoanFormData({ bankName: '', totalAmount: 0, installmentsCount: 1, installmentValue: 0, startDate: getTodayIsoDate() });

    const result = await db.save('serviflow_loans', newList, newLoan);
    if (result?.success) notify("Empréstimo registrado!");
  };

  const removeTransaction = async (id: string) => {
    if (!isAdmin) {
      notify("Você não tem permissão para excluir lançamentos.", "error");
      return;
    }
    if (confirm("Deseja realmente excluir este lançamento financeiro? Esta ação também removerá os dados da nuvem.")) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      const result = await db.remove('serviflow_transactions', id);
      if (result?.success) {
        notify("Lançamento removido da nuvem.");
      } else {
        notify("Removido localmente. Erro na nuvem.", "warning");
      }
    }
  };

  // Projeção para os próximos 30 dias
  const recurringTotal = transactions
    .filter(t => t.isRecurring)
    .reduce((s, t) => s + t.amount, 0);

  const loanInstallmentsTotal = loans
    .filter(l => l.installmentsPaid < l.installmentsCount)
    .reduce((s, l) => s + l.installmentValue, 0);

  const projectedExpenses = totalExpense + recurringTotal + loanInstallmentsTotal;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Fluxo de Caixa Profissional</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gestão completa de receitas, despesas e compromissos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (showForm && editingId) {
                setEditingId(null);
                setFormData({ type: 'RECEITA', date: getTodayIsoDate(), isRecurring: false, frequency: 'NONE' });
              } else {
                setShowForm(!showForm);
                if (!showForm) {
                  setEditingId(null);
                  setFormData({ type: 'RECEITA', date: getTodayIsoDate(), isRecurring: false, frequency: 'NONE' });
                }
              }
            }}
            className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-700 transition-all font-bold shadow-lg shadow-slate-200 dark:shadow-none"
          >
            {showForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo Lançamento</>}
          </button>
        </div>
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] self-start mb-8 gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'geral', label: 'LANÇAMENTOS' },
          { id: 'recorrencia', label: 'MENSAL/RECORRENTE' },
          { id: 'emprestimos', label: 'EMPRÉSTIMOS' },
          { id: 'historico', label: 'HISTÓRICO' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id as any); setShowForm(false); }}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeSubTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Saldo Realizado (Hoje)</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest text-wrap">
            Projetado: <span className={`${projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} whitespace-nowrap`}>R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Faturamento Realizado</p>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-125 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em]">Gastos Realizados</p>
            <ArrowDownLeft className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-125 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-rose-700 dark:text-rose-400 whitespace-nowrap">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-blue-600 p-6 rounded-3xl border border-blue-700 shadow-xl shadow-blue-900/20 dark:shadow-none group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em]">Projeção de Saídas</p>
            <Calendar className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-white whitespace-nowrap">R$ {projectedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-blue-200 mt-1 font-bold">Gastos atuais + Recorrência + Empréstimos</p>
        </div>
      </div>

      {activeSubTab === 'historico' ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl space-y-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between border-b dark:border-slate-700 pb-6 gap-4">
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">Extrato Financeiro</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Todas as entradas e saídas registradas</p>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear(prev => prev - 1);
                  } else {
                    setSelectedMonth(prev => prev - 1);
                  }
                }}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              
              <div className="px-4 text-center min-w-[140px]">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">{months[selectedMonth]}</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{selectedYear}</p>
              </div>

              <button 
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear(prev => prev + 1);
                  } else {
                    setSelectedMonth(prev => prev + 1);
                  }
                }}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                  {transactions.filter(t => {
                    const d = new Date(t.date + 'T00:00:00');
                    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                  }).length} Lançamentos
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const monthlyTrans = transactions.filter(t => {
                const [year, month] = t.date.split('-').map(Number);
                return (month - 1) === selectedMonth && year === selectedYear;
              });
              const mIncome = monthlyTrans.filter(t => t.type === 'RECEITA').reduce((s, t) => s + t.amount, 0);
              const mExpense = monthlyTrans.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);
              const mResult = mIncome - mExpense;

              return (
                <>
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                    <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Entradas no Mês</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">R$ {mIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                    <p className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Saídas no Mês</p>
                    <p className="text-lg font-black text-rose-700 dark:text-rose-400">R$ {mExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className={`p-4 ${mResult >= 0 ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'} border rounded-2xl`}>
                    <p className={`text-[8px] font-black ${mResult >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'} uppercase tracking-widest mb-1`}>Resultado Mensal</p>
                    <p className={`text-lg font-black ${mResult >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>R$ {mResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {transactions
              .filter(t => {
                const [year, month] = t.date.split('-').map(Number);
                return (month - 1) === selectedMonth && year === selectedYear;
              })
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(t => (
                <div key={t.id} className="group py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all rounded-2xl px-4 -mx-4">
                  <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                    {t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-tight uppercase">
                      {t.category} {t.type === 'EMPRESTIMO_SOCIO' && <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 rounded">SÓCIO</span>}
                    </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t.date.split('-').reverse().join('/')}</p>
                        {t.date > today && (
                          <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                            Agendado
                          </span>
                        )}
                        {t.isRecurring && (
                          <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                            Recorrente
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 flex items-center gap-2 max-w-sm">
                          <Tag className="w-2.5 h-2.5 text-slate-300" />
                          {t.description}
                        </p>
                      )}
                      
                      {t.attachment && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              const base64Data = t.attachment!;
                              const parts = base64Data.split(';base64,');
                              const contentType = parts[0].split(':')[1];
                              const raw = window.atob(parts[1]);
                              const rawLength = raw.length;
                              const uInt8Array = new Uint8Array(rawLength);
                              for (let i = 0; i < rawLength; ++i) {
                                uInt8Array[i] = raw.charCodeAt(i);
                              }
                              const blob = new Blob([uInt8Array], { type: contentType });
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar Documento
                          </button>
                          
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = t.attachment!;
                              link.download = t.attachmentName || 'anexo';
                              link.click();
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Baixar Arquivo"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <p className={`text-sm font-black ${t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO' ? 'text-emerald-600' : 'text-rose-600'} whitespace-nowrap`}>
                        {t.type === 'RECEITA' || t.type === 'EMPRESTIMO_SOCIO' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5">{t.id}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingId(t.id);
                            setFormData({ ...t });
                            setActiveSubTab('geral');
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="p-2 text-slate-200 hover:text-blue-500 transition-colors"
                          title="Editar Lançamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeTransaction(t.id)} 
                          className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {transactions.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Wallet className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum lançamento encontrado</p>
              </div>
            )}
          </div>
        </div>
      ) : showForm ? (
        activeSubTab === 'emprestimos' ? (
          <form onSubmit={handleAddLoan} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm border-b dark:border-slate-700 pb-4">Registrar Novo Empréstimo</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Instituição / Banco</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  required value={loanFormData.bankName} onChange={e => setLoanFormData({ ...loanFormData, bankName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required value={loanFormData.totalAmount || ''} onChange={e => setLoanFormData({ ...loanFormData, totalAmount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor da Parcela (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required value={loanFormData.installmentValue || ''} onChange={e => setLoanFormData({ ...loanFormData, installmentValue: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Total de Parcelas</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required value={loanFormData.installmentsCount} onChange={e => setLoanFormData({ ...loanFormData, installmentsCount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data de Início</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required value={loanFormData.startDate} onChange={e => setLoanFormData({ ...loanFormData, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Taxa de Juros Mensal (%)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={loanFormData.interestRate || ''} onChange={e => setLoanFormData({ ...loanFormData, interestRate: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all font-bold uppercase tracking-widest">
                Registrar Compromisso
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm border-b dark:border-slate-700 pb-4 uppercase tracking-widest">
              {editingId ? 'Editar Lançamento' : (activeSubTab === 'recorrencia' ? 'Novo Item Recorrente (Fixo)' : 'Lançamento Único')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
                <select className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                  <option value="RECEITA">Receita (+)</option>
                  <option value="DESPESA">Despesa (-)</option>
                  <option value="EMPRESTIMO_SOCIO">Empréstimo Sócio (+)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  required value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Categoria / Descrição</label>
                <input type="text" placeholder="ex: Aluguel, Venda..." className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                  required value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Frequência</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value as RecurrenceFrequency, isRecurring: e.target.value !== 'NONE' })}>
                  <option value="NONE">Lançamento Avulso</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 mb-1">Observações / Notas Extras</label>
                <input type="text" placeholder="Adicione detalhes adicionais aqui..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="lg:col-span-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Comprovante / Extrato (Opcional)</label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl group hover:border-blue-400 transition-all relative overflow-hidden">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                    {formData.attachment ? <FileText className="w-6 h-6 text-emerald-500" /> : <Paperclip className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                      {formData.attachmentName || 'Clique para anexar documento'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                      {formData.attachment ? 'Arquivo pronto para salvar' : 'Imagens, PDF ou Documentos'}
                    </p>
                  </div>
                  {formData.attachment && (
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, attachment: undefined, attachmentName: undefined }))}
                      className="ml-auto relative z-20 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all font-bold uppercase tracking-widest">
                {editingId ? 'Salvar Alterações' : 'Efetivar Lançamento'}
              </button>
            </div>
          </form>
        )
      ) : activeSubTab === 'emprestimos' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map(loan => (
            <div key={loan.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black">
                    $
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{loan.bankName}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{loan.startDate}</p>
                  </div>
                </div>
                <button onClick={async () => {
                  if (confirm("Remover este compromisso financeiro?")) {
                    setLoans(loans.filter(l => l.id !== loan.id));
                    await db.remove('serviflow_loans', loan.id);
                  }
                }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">Total Financiado</span>
                  <span className="text-slate-900 font-black whitespace-nowrap">R$ {loan.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">Valor Mensal</span>
                  <span className="text-blue-600 font-black whitespace-nowrap">R$ {loan.installmentValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">Parcelas</span>
                  <span className="text-slate-900 font-black">{loan.installmentsPaid} / {loan.installmentsCount}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={async () => {
                    if (loan.installmentsPaid >= loan.installmentsCount) {
                      notify("Todas as parcelas já foram pagas!", "info");
                      return;
                    }
                    if (confirm(`Confirmar pagamento da parcela de R$ ${loan.installmentValue.toLocaleString()}?`)) {
                      const updatedLoans = loans.map(l => {
                        if (l.id === loan.id) {
                          return {
                            ...l,
                            installmentsPaid: l.installmentsPaid + 1,
                            remainingAmount: l.remainingAmount - l.installmentValue
                          };
                        }
                        return l;
                      });
                      setLoans(updatedLoans);
                      await db.save('serviflow_loans', updatedLoans);

                      const newT: Transaction = {
                        id: `T-LOAN-${Date.now()}`,
                        amount: loan.installmentValue,
                        category: `Parcela: ${loan.bankName}`,
                        date: getTodayIsoDate(),
                        type: 'DESPESA',
                        description: `Pagamento de parcela ${loan.installmentsPaid + 1}/${loan.installmentsCount}`
                      };
                      const updatedTransactions = [newT, ...transactions];
                      setTransactions(updatedTransactions);
                      await db.save('serviflow_transactions', updatedTransactions);

                      notify("Parcela baixada com sucesso!");
                    }
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all font-bold"
                >
                  Baixar Parcela
                </button>
              </div>
            </div>
          ))}
          {loans.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 font-bold italic">Nenhum empréstimo ou financiamento ativo.</p>}
        </div>
      ) : null}
    </div>
  );
};

export default FinancialControl;
