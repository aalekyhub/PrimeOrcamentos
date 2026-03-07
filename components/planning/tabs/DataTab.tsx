import React from 'react';
import { PlanningHeader, Customer } from '../types';

interface DataTabProps {
    plan: PlanningHeader;
    customers: Customer[];
    onUpdatePlan: (plan: PlanningHeader) => void;
}

export const DataTab: React.FC<DataTabProps> = ({ plan, customers, onUpdatePlan }) => {
    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Identificador do Projeto</label>
                    <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => onUpdatePlan({ ...plan, name: e.target.value.toUpperCase() })}
                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/10 outline-none shadow-sm transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status de Planejamento</label>
                    <select
                        value={plan.status}
                        onChange={(e) => onUpdatePlan({ ...plan, status: e.target.value as any })}
                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="Planejamento">Planejamento</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cliente Vinculado</label>
                <select
                    value={plan.client_id}
                    onChange={(e) => onUpdatePlan({ ...plan, client_id: e.target.value, client_name: customers.find(c => c.id === e.target.value)?.name })}
                    className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">Selecione um cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço da Obra</label>
                <input
                    type="text"
                    value={plan.address}
                    onChange={(e) => onUpdatePlan({ ...plan, address: e.target.value })}
                    className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Rua, Número, Bairro, Cidade..."
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                    <select
                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/20"
                        value={plan.type}
                        onChange={(e) => onUpdatePlan({ ...plan, type: e.target.value })}
                    >
                        <option>Reforma</option>
                        <option>Construção Nova</option>
                        <option>Manutenção</option>
                        <option>Outros</option>
                    </select>
                </div>
            </div>

            <div className="p-6 bg-blue-50/50 dark:bg-slate-800/50 rounded-3xl border border-blue-100 dark:border-slate-700/50">
                <p className="text-[10px] font-bold text-blue-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                    Nota: Os dados preenchidos aqui são utilizados nos cabeçalhos de todos os relatórios e documentos gerados para esta obra.
                </p>
            </div>
        </div>
    );
};
