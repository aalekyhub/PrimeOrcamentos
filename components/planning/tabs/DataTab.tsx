import React from 'react';
import { PlanningHeader, Customer } from '../types';

interface DataTabProps {
    plan: PlanningHeader;
    customers: Customer[];
    onUpdatePlan: (plan: PlanningHeader) => void;
}

export const DataTab: React.FC<DataTabProps> = ({ plan, customers, onUpdatePlan }) => {
    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nome do Projeto</label>
                    <input
                        type="text"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        value={plan.name}
                        onChange={(e) => onUpdatePlan({ ...plan, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</label>
                    <select
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        value={plan.client_id}
                        onChange={(e) => onUpdatePlan({ ...plan, client_id: e.target.value, client_name: customers.find(c => c.id === e.target.value)?.name })}
                    >
                        <option value="">Selecione um cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Endereço da Obra</label>
                    <input
                        type="text"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        value={plan.address}
                        onChange={(e) => onUpdatePlan({ ...plan, address: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Serviço</label>
                    <select
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        value={plan.type}
                        onChange={(e) => onUpdatePlan({ ...plan, type: e.target.value })}
                    >
                        <option>Reforma</option>
                        <option>Construção Nova</option>
                        <option>Manutenção</option>
                        <option>Outros</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                    <select
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        value={plan.status}
                        onChange={(e) => onUpdatePlan({ ...plan, status: e.target.value as any })}
                    >
                        <option>Planejamento</option>
                        <option>Em Andamento</option>
                        <option>Concluído</option>
                        <option>Cancelado</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
