import React, { useState, useMemo } from 'react';
import { Plus, Search, CheckCircle, Copy, Pencil, Printer, FileDown, Trash2 } from 'lucide-react';
import { ServiceOrder, OrderStatus } from '../../types';

interface BudgetListProps {
    orders: ServiceOrder[];
    onNewBudget: () => void;
    onApprove: (budget: ServiceOrder) => void;
    onDuplicate: (budget: ServiceOrder) => void;
    onEdit: (budget: ServiceOrder) => void;
    onPrint: (budget: ServiceOrder) => void;
    onDelete: (budget: ServiceOrder) => void;
}

const BudgetList: React.FC<BudgetListProps> = ({
    orders,
    onNewBudget,
    onApprove,
    onDuplicate,
    onEdit,
    onPrint,
    onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const budgets = useMemo(() => orders.filter(o =>
        (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) &&
        (o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm))
    ), [orders, searchTerm]);

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-2">
                        Orçamentos <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full">{orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED).length}</span>
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Gerencie suas propostas comerciais</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={onNewBudget} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md shadow-blue-900/20 hover:shadow-blue-900/40 transition-all flex items-center gap-2 active:scale-95">
                        <Plus className="w-4 h-4" /> Novo Orçamento
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-[1.5rem] border dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou Orçamento..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 dark:text-slate-300 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 border-b dark:border-slate-800">
                        <tr>
                            <th className="px-8 py-5">ORC</th>
                            <th className="px-8 py-5">CLIENTE</th>
                            <th className="px-8 py-5">DESCRIÇÃO</th>
                            <th className="px-8 py-5">VALOR</th>
                            <th className="px-8 py-5 text-right">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {budgets.map(budget => (
                            <tr key={budget.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all">
                                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600">
                                    <div className="flex items-center gap-2">
                                        {budget.id}
                                        {budget.status === OrderStatus.APPROVED && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900 dark:text-slate-100">{budget.customerName}</td>
                                <td className="px-8 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{budget.description}</td>
                                <td className="px-8 py-5 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {budget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {budget.status !== OrderStatus.APPROVED && (
                                        <button onClick={() => onApprove(budget)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Aprovar">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => onDuplicate(budget)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Duplicar">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onEdit(budget)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onPrint(budget)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Imprimir">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onDelete(budget)} className="p-2 text-rose-300 hover:text-rose-600 transition-colors" title="Excluir">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {budgets.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                    Nenhum orçamento encontrado
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default BudgetList;
