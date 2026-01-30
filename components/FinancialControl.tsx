
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
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'recorrencia' | 'emprestimos'>('geral');
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

  const totalIncome = transactions.filter(t => t.type === 'RECEITA').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);

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

  // Projeção para os próximos 30 dias (itens recorrentes e parcelas)
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

      {/* Tabs Financeiras */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'geral', label: 'Lançamentos' },
          { id: 'recorrencia', label: 'Mensal/Recorrente' },
          { id: 'emprestimos', label: 'Empréstimos' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id as any); setShowForm(false); }}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Saldo em Caixa</p>
          <h3 className="text-2xl font-black text-slate-900">R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Faturamento</p>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 group-hover:scale-125 transition-transform" />
          </div>
          <h3 className="text-2xl font-black text-emerald-700">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Total Gasto</p>
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

      {showForm && (
        activeSubTab === 'emprestimos' ? (
          <form onSubmit={handleAddLoan} className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-4">Registrar Novo Empréstimo</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Instituição / Banco</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={loanFormData.bankName} onChange={e => setLoanFormData({ ...loanFormData, bankName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={loanFormData.totalAmount || ''} onChange={e => setLoanFormData({ ...loanFormData, totalAmount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor da Parcela (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={loanFormData.installmentValue || ''} onChange={e => setLoanFormData({ ...loanFormData, installmentValue: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Total de Parcelas</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={loanFormData.installmentsCount} onChange={e => setLoanFormData({ ...loanFormData, installmentsCount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data de Início</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={loanFormData.startDate} onChange={e => setLoanFormData({ ...loanFormData, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Taxa de Juros Mensal (%)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={loanFormData.interestRate || ''} onChange={e => setLoanFormData({ ...loanFormData, interestRate: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all">
                Registrar Compromisso
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-slate-800 text-sm border-b pb-4">
              {activeSubTab === 'recorrencia' ? 'Novo Item Recorrente (Fixo)' : 'Lançamento Único'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                  <option value="RECEITA">Receita (+)</option>
                  <option value="DESPESA">Despesa (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoria / Descrição</label>
                <input type="text" placeholder="ex: Aluguel, Venda..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Frequência</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value as RecurrenceFrequency, isRecurring: e.target.value !== 'NONE' })}>
                  <option value="NONE">Lançamento Avulso</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all">
                Efetivar Lançamento
              </button>
            </div>
          </form>
        )
      )}

      {activeSubTab === 'emprestimos' ? (
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
                      // 1. Atualiza o empréstimo
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

                      // 2. Cria a transação de despesa
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
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                >
                  Baixar Parcela
                </button>
              </div>
            </div>
          ))}
          {loans.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 font-bold italic">Nenhum empréstimo ou financiamento ativo.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 min-w-[600px]">
            <h4 className="font-bold text-slate-800 text-sm">
              {activeSubTab === 'geral' ? 'Histórico de Lançamentos' : 'Itens de Recorrência Fixa'}
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions
              .filter(t => activeSubTab === 'geral' ? !t.isRecurring : t.isRecurring)
              .sort((a, b) => b.date.localeCompare(a.date)) // Sort by date descending
              .map(t => (
                <div key={t.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'RECEITA' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-tight">{t.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.date.split('-').reverse().join('/')}</p>
                        {t.isRecurring && (
                          <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                            Recorrente ({t.frequency})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className={`text-sm font-black ${t.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'RECEITA' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-400 italic">{t.description}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => removeTransaction(t.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {transactions.filter(t => activeSubTab === 'geral' ? !t.isRecurring : t.isRecurring).length === 0 && (
              <p className="text-center py-20 text-slate-400 font-bold italic">Nenhum lançamento encontrado nesta categoria.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;
