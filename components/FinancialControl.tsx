
import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Calendar, Tag, Trash2 } from 'lucide-react';
import { Transaction, UserAccount } from '../types';
import { useNotify } from './ToastProvider';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUser: UserAccount;
}

const FinancialControl: React.FC<Props> = ({ transactions, setTransactions, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const { notify } = useNotify();
  const isAdmin = currentUser.role === 'admin';
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'RECEITA',
    date: new Date().toISOString().split('T')[0]
  });

  const totalIncome = transactions.filter(t => t.type === 'RECEITA').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;

    const newT: Transaction = {
      id: `T-${Date.now()}`,
      amount: Number(formData.amount),
      category: formData.category || 'Geral',
      date: formData.date || new Date().toISOString().split('T')[0],
      type: formData.type as 'RECEITA' | 'DESPESA',
      description: formData.description || ''
    };

    setTransactions(prev => [newT, ...prev]);
    setShowForm(false);
    setFormData({ type: 'RECEITA', date: new Date().toISOString().split('T')[0] });
    notify("Transação lançada com sucesso!");
  };

  const removeTransaction = (id: string) => {
    if (!isAdmin) {
      notify("Você não tem permissão para excluir lançamentos.", "error");
      return;
    }
    if (confirm("Deseja realmente excluir este lançamento financeiro? Esta ação também removerá os dados da nuvem.")) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      db.remove('transactions', id);
      notify("Lançamento removido.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Controle Financeiro</h2>
          <p className="text-slate-500 text-sm">Gestão de fluxo de caixa e lançamentos.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-200"
        >
          {showForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo Lançamento</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Saldo Total</p>
          <h3 className="text-3xl font-bold text-slate-900">R$ {(totalIncome - totalExpense).toLocaleString()}</h3>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Receitas</p>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-3xl font-bold text-emerald-700">R$ {totalIncome.toLocaleString()}</h3>
        </div>
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Despesas</p>
            <ArrowDownLeft className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-3xl font-bold text-rose-700">R$ {totalExpense.toLocaleString()}</h3>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
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
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <input type="text" placeholder="ex: Aluguel, Venda..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
              Efetivar Lançamento
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-bold text-slate-800 text-sm">Histórico Recente</h4>
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {t.type === 'RECEITA' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{t.category}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-sm font-black ${t.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'RECEITA' ? '+' : '-'}R$ {t.amount.toLocaleString()}
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
        </div>
      </div>
    </div>
  );
};

export default FinancialControl;
