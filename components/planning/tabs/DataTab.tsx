import React from 'react';
import { PlanningHeader, Customer } from '../../../types';

interface Props {
    currentPlan: PlanningHeader;
    customers: Customer[];
    onUpdate: (plan: PlanningHeader) => void;
}

export const DataTab: React.FC<Props> = ({ currentPlan, customers, onUpdate }) => {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Obra</label>
                    <input
                        type="text"
                        value={currentPlan.name}
                        onChange={(e) => onUpdate({ ...currentPlan, name: e.target.value.toUpperCase() })}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label>
                    <select
                        value={currentPlan.type}
                        onChange={(e) => onUpdate({ ...currentPlan, type: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                    >
                        <option>Reforma</option>
                        <option>Manutenção</option>
                        <option>Construção</option>
                        <option>Retrofit</option>
                        <option>Instalação</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cliente</label>
                <select
                    value={currentPlan.client_id}
                    onChange={(e) => {
                        const clientId = e.target.value;
                        const customer = customers.find((c) => c.id === clientId);
                        onUpdate({
                            ...currentPlan,
                            client_id: clientId,
                            client_name: customer ? customer.name : '',
                        });
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                >
                    <option value="">Selecione...</option>
                    {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label>
                <input
                    type="text"
                    value={currentPlan.address}
                    onChange={(e) => onUpdate({ ...currentPlan, address: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                    placeholder="Local da execução"
                />
            </div>
        </div>
    );
};
