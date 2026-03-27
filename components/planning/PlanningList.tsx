import React from 'react';
import { Building2, Plus, ArrowRight, Calendar, HardHat } from 'lucide-react';
import { PlanningHeader } from './types';

interface PlanningListProps {
    plans: PlanningHeader[];
    onCreatePlan: () => void;
    onSelectPlan: (id: string) => void;
}

export const PlanningList: React.FC<PlanningListProps> = ({ plans, onCreatePlan, onSelectPlan }) => {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <HardHat className="text-blue-600" size={36} /> Planejamento de Obras
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">Crie e gerencie o levantamento de custos detalhados para seus novos projetos.</p>
                </div>
                <button
                    onClick={onCreatePlan}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200/50 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                >
                    <Plus size={20} /> Novo Planejamento
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div
                        key={plan.id}
                        onClick={() => onSelectPlan(plan.id)}
                        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 group-hover:bg-blue-600 transition-colors"></div>
                        <div className="flex justify-between items-start mb-2.5 pl-2">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-blue-700 transition-colors truncate uppercase">{plan.name}</h3>
                                <p className="text-sm text-slate-500 font-medium truncate">{plan.client_name || 'Cliente não informado'}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${plan.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {plan.status}
                            </span>
                        </div>

                        <div className="pl-2 space-y-2 mb-3">
                            <div className="flex items-center text-xs text-slate-500">
                                <Calendar size={14} className="mr-2 opacity-50" />
                                Criado em {new Date(plan.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-xs text-slate-500">
                                <HardHat size={14} className="mr-2 opacity-50" />
                                {plan.type}
                            </div>
                        </div>

                        <div className="pl-2 border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Custo Estimado</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">
                                    R$ {(plan.total_real_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center text-blue-600 font-black text-xs group-hover:translate-x-1 transition-transform">
                                EDITAR <ArrowRight size={16} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Building2 size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-bold uppercase tracking-widest text-xs">Nenhum planejamento encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
};
