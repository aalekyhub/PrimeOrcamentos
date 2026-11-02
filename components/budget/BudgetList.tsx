import React, { useState, useMemo } from 'react';
import { Plus, Search, CheckCircle, Copy, Printer, FileDown, Trash2, ScrollText, Wrench } from 'lucide-react';
import { ServiceOrder, OrderStatus } from '../../types';

interface BudgetListProps {
    orders: ServiceOrder[];
    onNewBudget: () => void;
    onApprove: (budget: ServiceOrder) => void;
    onDuplicate: (budget: ServiceOrder) => void;
    onEdit: (budget: ServiceOrder) => void;
    onPrint: (budget: ServiceOrder) => void;
    onGenerateContract: (budget: ServiceOrder) => void;
    onGenerateMaintenanceContract: (budget: ServiceOrder) => void;
    onBill: (budget: ServiceOrder) => void;
    onDelete: (budget: ServiceOrder) => void;
    isAdmin?: boolean;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED';
const FILTER_STORAGE_KEY = 'prime_budget_status_filter';

const loadStatusFilter = (): StatusFilter => {
    try {
        const saved = localStorage.getItem(FILTER_STORAGE_KEY);
        if (saved === 'ALL' || saved === 'PENDING' || saved === 'APPROVED') return saved;
    } catch { /* sem acesso ao localStorage: usa o padrão */ }
    return 'ALL';
};

const BudgetList: React.FC<BudgetListProps> = ({
    orders,
    onNewBudget,
    onApprove,
    onDuplicate,
    onEdit,
    onPrint,
    onGenerateContract,
    onGenerateMaintenanceContract,
    onBill,
    onDelete,
    isAdmin = true
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(loadStatusFilter);

    const changeStatusFilter = (filter: StatusFilter) => {
        setStatusFilter(filter);
        try { localStorage.setItem(FILTER_STORAGE_KEY, filter); } catch { /* ignora */ }
    };

    const counts = useMemo(() => {
        const pending = orders.filter(o => o.status === OrderStatus.PENDING).length;
        const approved = orders.filter(o => o.status === OrderStatus.APPROVED).length;
        return { ALL: pending + approved, PENDING: pending, APPROVED: approved };
    }, [orders]);

    const budgets = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return orders.filter(o => {
            const matchesStatus =
                statusFilter === 'ALL'
                    ? o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED
                    : o.status === (statusFilter === 'PENDING' ? OrderStatus.PENDING : OrderStatus.APPROVED);
            return matchesStatus && (o.customerName.toLowerCase().includes(term) || o.id.includes(searchTerm));
        });
    }, [orders, searchTerm, statusFilter]);

    const filterTabs: { id: StatusFilter; label: string }[] = [
        { id: 'ALL', label: 'Todos' },
        { id: 'PENDING', label: 'Pendentes' },
        { id: 'APPROVED', label: 'Aprovados' },
    ];

    const renderActions = (budget: ServiceOrder) => (
        <>
            {isAdmin && budget.status !== OrderStatus.APPROVED && (
                <button onClick={(e) => { e.stopPropagation(); onApprove(budget); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition-colors" title="Aprovar">
                    <CheckCircle className="w-4 h-4" />
                </button>
            )}
            {budget.status === OrderStatus.APPROVED && (
                <button onClick={(e) => { e.stopPropagation(); onBill(budget); }} className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors" title="Faturar (Gerar Contas a Receber)">
                    <FileDown className="w-4 h-4" />
                </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(budget); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors" title="Duplicar">
                <Copy className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onPrint(budget); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors" title="Imprimir">
                <Printer className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onGenerateContract(budget); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors" title="Gerar Contrato">
                <ScrollText className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onGenerateMaintenanceContract(budget); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors" title="Gerar Contrato de Manutenção">
                <Wrench className="w-4 h-4" />
            </button>
            {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(budget); }} className="p-2 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </>
    );

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-2">
                        Orçamentos <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full">{counts.ALL}</span>
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
                <div className="mt-3 flex flex-wrap gap-2">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => changeStatusFilter(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${statusFilter === tab.id
                                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            {tab.label}
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${statusFilter === tab.id ? 'bg-white/20' : 'bg-slate-200/70 dark:bg-slate-700'}`}>
                                {counts[tab.id]}
                            </span>
                        </button>
                    ))}
                </div>
                {!isAdmin && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                        <ScrollText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest leading-relaxed">
                            Apenas Administradores podem alterar ou excluir orçamentos salvos. Você está em modo de visualização restringida.
                        </p>
                    </div>
                )}
            </div>

            <div className="md:hidden space-y-3">
                {budgets.map(budget => (
                    <div key={budget.id} onClick={() => onEdit(budget)} className="bg-white dark:bg-slate-900/50 rounded-2xl border dark:border-slate-800 shadow-sm p-4 space-y-3 cursor-pointer active:bg-blue-50/60 dark:active:bg-slate-800/50">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-black text-blue-600">{budget.id}</span>
                            {budget.status === OrderStatus.APPROVED ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle className="w-3.5 h-3.5" /> Aprovado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendente
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">{budget.customerName}</p>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase line-clamp-2 mt-1">{budget.description}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {budget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <div className="flex gap-0.5 flex-wrap justify-end">
                                {renderActions(budget)}
                            </div>
                        </div>
                    </div>
                ))}
                {budgets.length === 0 && (
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border dark:border-slate-800 p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        Nenhum orçamento encontrado
                    </div>
                )}
            </div>

            <div className="hidden md:block bg-white dark:bg-slate-900/50 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 border-b dark:border-slate-800">
                        <tr>
                            <th className="px-5 py-4">ORC</th>
                            <th className="px-5 py-4">STATUS</th>
                            <th className="px-5 py-4">CLIENTE</th>
                            <th className="px-5 py-4">DESCRIÇÃO</th>
                            <th className="px-5 py-4">VALOR</th>
                            <th className="px-5 py-4 text-right">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {budgets.map(budget => (
                            <tr key={budget.id} onClick={() => onEdit(budget)} className="hover:bg-blue-50/60 dark:hover:bg-slate-800/50 group transition-all cursor-pointer">
                                <td className="px-5 py-4 text-xs font-mono font-black text-blue-600 whitespace-nowrap">{budget.id}</td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                    {budget.status === OrderStatus.APPROVED ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                            <CheckCircle className="w-3.5 h-3.5" /> Aprovado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendente
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-4 text-sm font-black uppercase text-slate-900 dark:text-slate-100">{budget.customerName}</td>
                                <td className="px-5 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase max-w-[260px] truncate" title={budget.description}>{budget.description}</td>
                                <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {budget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-5 py-4">
                                    <div className="flex justify-end gap-1">
                                        {renderActions(budget)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {budgets.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
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
