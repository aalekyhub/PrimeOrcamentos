
import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Calendar, Tag, Trash2 } from 'lucide-react';
import { Transaction, UserAccount, RecurrenceFrequency, Loan } from '../types';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';

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
  const { notify } = useNotify();
  const isAdmin = currentUser.role === 'admin';
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'RECEITA',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    frequency: 'NONE'
  });

  const [loanFormData, setLoanFormData] = useState<Partial<Loan>>({
    bankName: '',
    totalAmount: 0,
    installmentsCount: 1,
    installmentValue: 0,
    startDate: new Date().toISOString().split('T')[0]
  });

  const today = new Date().toISOString().split('T')[0];
  const realizedTransactions = transactions.filter(t => t.date <= today);

  const totalIncome = realizedTransactions.filter(t => t.type === 'RECEITA').reduce((s, t) => s + t.amount, 0);
  const totalExpense = realizedTransactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);

  const projectedIncome = transactions.filter(t => t.type === 'RECEITA').reduce((s, t) => s + t.amount, 0);
  const projectedExpense = transactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);
  const projectedBalance = projectedIncome - projectedExpense;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;

    const newT: Transaction = {
      id: `T-${Date.now()}`,
      amount: Number(formData.amount),
      category: formData.category || 'Geral',
      date: formData.date || new Date().toISOString().split('T')[0],
      type: formData.type as 'RECEITA' | 'DESPESA',
      description: formData.description || '',
      isRecurring: formData.isRecurring,
      frequency: formData.frequency
    };

    const newList = [newT, ...transactions];
    setTransactions(newList);
    setShowForm(false);
    setFormData({ type: 'RECEITA', date: new Date().toISOString().split('T')[0], isRecurring: false, frequency: 'NONE' });

    const result = await db.save('serviflow_transactions', newList);
    if (result?.success) notify("Transação lançada!");
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
    setLoanFormData({ bankName: '', totalAmount: 0, installmentsCount: 1, installmentValue: 0, startDate: new Date().toISOString().split('T')[0] });

    const result = await db.save('serviflow_loans', newList);
    if (result?.success) notify("Empréstimo registrado!");
  };

  const removeTransaction = async (id: string) => {
    if (!isAdmin) {
      notify("Você não tem permissão para excluir lançamentos.", "error");
      return;
    }
    if (confirm("Deseja realmente excluir este lançamento financeiro? Esta ação também removerá os dados da nuvem.")) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      const result = await db.remove('transactions', id);
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Fluxo de Caixa Profissional</h2>
          <p className="text-slate-500 text-sm">Gestão completa de receitas, despesas e compromissos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-200"
          >
            {showForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo Lançamento</>}
          </button>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] self-start mb-8 gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'geral', label: 'LANÇAMENTOS' },
          { id: 'recorrencia', label: 'MENSAL/RECORRENTE' },
          { id: 'emprestimos', label: 'EMPRÉSTIMOS' },
          { id: 'historico', label: 'HISTÓRICO' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id as any); setShowForm(false); }}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Saldo Realizado (Hoje)</p>
          <h3 className="text-2xl font-black text-slate-900">R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
            Projetado: <span className={projectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Faturamento Realizado</p>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 group-hover:scale-125 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-emerald-700">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Gastos Realizados</p>
            <ArrowDownLeft className="w-4 h-4 text-rose-600 group-hover:scale-125 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-rose-700">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-blue-600 p-6 rounded-3xl border border-blue-700 shadow-xl shadow-blue-100 group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em]">Projeção de Saídas</p>
            <Calendar className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-white">R$ {projectedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-blue-200 mt-1 font-bold">Gastos atuais + Recorrência + Empréstimos</p>
        </div>
      </div>

      {activeSubTab === 'historico' ? (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b pb-6">
            <div>
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Extrato Financeiro Completo</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Todas as entradas e saídas registradas</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-500 uppercase">{transactions.length} Lançamentos</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {transactions
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(t => (
                <div key={t.id} className="group py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-all rounded-2xl px-4 -mx-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'RECEITA' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-tight uppercase">{t.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.date.split('-').reverse().join('/')}</p>
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
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <p className={`text-sm font-black ${t.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'RECEITA' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5">{t.id}</p>
                    </div>
                    <button onClick={() => removeTransaction(t.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          <form onSubmit={handleAddLoan} className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-4">Registrar Novo Empréstimo</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Instituição / Banco</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
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
          <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-4 uppercase tracking-widest">
              {activeSubTab === 'recorrencia' ? 'Novo Item Recorrente (Fixo)' : 'Lançamento Único'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                  <option value="RECEITA">Receita (+)</option>
                  <option value="DESPESA">Despesa (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoria / Descrição</label>
                <input type="text" placeholder="ex: Aluguel, Venda..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
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
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all font-bold uppercase tracking-widest">
                Efetivar Lançamento
              </button>
            </div>
          </form>
        )
      ) : activeSubTab === 'emprestimos' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map(loan => (
            <div key={loan.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                    $
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{loan.bankName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{loan.startDate}</p>
                  </div>
                </div>
                <button onClick={async () => {
                  if (confirm("Remover este compromisso financeiro?")) {
                    const newList = loans.filter(l => l.id !== loan.id);
                    setLoans(newList);
                    await db.save('serviflow_loans', newList);
                  }
                }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">Total Financiado</span>
                  <span className="text-slate-900 font-black">R$ {loan.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">Valor Mensal</span>
                  <span className="text-blue-600 font-black">R$ {loan.installmentValue.toLocaleString()}</span>
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
                        date: new Date().toISOString().split('T')[0],
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
