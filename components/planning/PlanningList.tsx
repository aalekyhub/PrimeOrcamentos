import React from 'react';
import { Plus } from 'lucide-react';
import { PlanningHeader } from '../../types';

interface PlanningListProps {
    plans: PlanningHeader[];
    onCreatePlan: () => void;
    onSelectPlan: (id: string) => void;
}

export const PlanningList: React.FC<PlanningListProps> = ({ plans, onCreatePlan, onSelectPlan }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Planejamento de Obras</h1>
                <button
                    onClick={onCreatePlan}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-950/20"
                >
                    <Plus size={20} /> Nova Obra
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <div key={plan.id}
                        className="bg-white shadow-xl w-full p-6 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{plan.name}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${plan.status === 'Concluído' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'} `}>
                                {plan.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{plan.type}</p>
                        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-4">
                            <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                            <span>ID: {plan.id}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => onSelectPlan(plan.id)}
                                className="text-blue-600 dark:text-blue-400 font-bold text-sm bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors w-full"
                            >
                                Editar Planejamento
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
