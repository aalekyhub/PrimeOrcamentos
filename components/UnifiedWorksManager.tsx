import React, { useState, useEffect } from 'react';
import {
    Building2, Calendar, Search, Filter, Plus, FileText,
    ArrowRight, HardHat, PieChart, TrendingUp, AlertTriangle, CheckCircle,
    Trash2, Copy
} from 'lucide-react';
import { db } from '../services/db';
import { PlanningHeader, Customer } from '../types';
import PlanningManager from './PlanningManager';
import WorksManager from './WorksManager';

interface Props {
    customers: Customer[];
    onGenerateBudget?: (plan: any, services: any[], totalMaterial: number, totalLabor: number, totalIndirect: number) => void;
}

const UnifiedWorksManager: React.FC<Props> = ({ customers, onGenerateBudget }) => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<'planning' | 'execution'>('planning');

    const [plans, setPlans] = useState<PlanningHeader[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = () => {
        const allPlans = db.load('serviflow_plans', []) as PlanningHeader[];
        setPlans(allPlans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    };

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        setActiveModule('planning'); // Default to planning
        setView('detail');
    };

    const handleBack = () => {
        setView('list');
        setSelectedPlanId(null);
        loadPlans(); // Refresh list on back
    };

    const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Deseja excluir permanentemente este planejamento e todos os dados de execução vinculados?')) return;

        try {
            // 1. Delete Planning Data
            const allPlans = db.load('serviflow_plans', []) as any[];
            await db.save('serviflow_plans', allPlans.filter(p => p.id !== id));

            const tables = [
                'serviflow_plan_services',
                'serviflow_plan_materials',
                'serviflow_plan_labor',
                'serviflow_plan_indirects'
            ];

            for (const table of tables) {
                const data = db.load(table, []) as any[];
                await db.save(table, data.filter((item: any) => item.plan_id !== id));
            }

            // 2. Delete Linked Work Data (Execution)
            const allWorks = db.load('serviflow_works', []) as any[];
            const linkedWork = allWorks.find(w => w.plan_id === id);

            if (linkedWork) {
                await db.save('serviflow_works', allWorks.filter(w => w.plan_id !== id));
                const workTables = [
                    'serviflow_work_services',
                    'serviflow_work_materials',
                    'serviflow_work_labor',
                    'serviflow_work_indirects',
                    'serviflow_work_taxes'
                ];
                for (const table of workTables) {
                    const data = db.load(table, []) as any[];
                    await db.save(table, data.filter((item: any) => item.work_id !== linkedWork.id));
                }
            }

            loadPlans();
            alert('Projeto excluído com sucesso.');
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir projeto.');
        }
    };

    const handleDuplicatePlan = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Deseja criar uma cópia deste planejamento?')) return;

        try {
            const allPlans = db.load('serviflow_plans', []) as any[];
            const sourcePlan = allPlans.find(p => p.id === id);
            if (!sourcePlan) return;

            const newPlanId = db.generateId('PLAN');
            const newPlan = {
                ...sourcePlan,
                id: newPlanId,
                name: `CÓPIA - ${sourcePlan.name}`,
                created_at: new Date().toISOString()
            };

            // Duplicate items
            const mapping = [
                { table: 'serviflow_plan_services', idPrefix: 'PSVC' },
                { table: 'serviflow_plan_materials', idPrefix: 'PMAT' },
                { table: 'serviflow_plan_labor', idPrefix: 'PLAB' },
                { table: 'serviflow_plan_indirects', idPrefix: 'PIND' }
            ];

            for (const map of mapping) {
                const allItems = db.load(map.table, []) as any[];
                const sourceItems = allItems.filter(item => item.plan_id === id);
                const newItems = sourceItems.map(item => ({
                    ...item,
                    id: db.generateId(map.idPrefix),
                    plan_id: newPlanId
                }));
                await db.save(map.table, [...allItems, ...newItems]);
            }

            await db.save('serviflow_plans', [newPlan, ...allPlans]);
            loadPlans();
            alert('Projeto duplicado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao duplicar projeto.');
        }
    };

    if (view === 'detail' && selectedPlanId) {
        return (
            <div className="h-full flex flex-col">
                {/* Unified Header with Module Toggles */}
                <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                            ← Voltar
                        </button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <h2 className="text-xl font-bold text-slate-800">Gerenciar Obra</h2>
                    </div>

                    {/* Module Switcher - The Core Unification Feature */}
                    <div className="bg-slate-100 p-1 rounded-lg flex shadow-inner">
                        <button
                            onClick={() => setActiveModule('planning')}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeModule === 'planning'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Calendar size={16} /> Planejamento (Previsto)
                        </button>
                        <button
                            onClick={() => setActiveModule('execution')}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeModule === 'execution'
                                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <HardHat size={16} /> Execução (Realizado)
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-slate-50 relative">
                    {activeModule === 'planning' ? (
                        <div className="h-full">
                            <PlanningManager
                                customers={customers}
                                embeddedPlanId={selectedPlanId}
                                onBack={handleBack} // This might be redundant if we hide the internal back button
                                onPlanCreated={(newPlan) => {
                                    setSelectedPlanId(newPlan.id);
                                    loadPlans(); // Refresh the list
                                }}
                                onGenerateBudget={onGenerateBudget}
                            />
                        </div>
                    ) : (
                        <div className="h-full">
                            <WorksManager
                                customers={customers}
                                embeddedPlanId={selectedPlanId}
                                onBack={handleBack}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // List View (Unified "Gestão de Obras" List)
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Building2 className="text-emerald-600" size={32} /> Gestão de Obras
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie o planejamento e a execução dos seus projetos em um só lugar.</p>
                </div>
                <button
                    onClick={() => {
                        // Create new plan/work -> actually we should probably defer this to PlanningManager's creation logic
                        // But since we wrap it, we can switch to Detail mode with 'new' ID or similar?
                        // For simplicity, let's open PlanningManager in 'new' mode via a special null ID or handle it inside PlanningManager
                        // A simple way is to invoke PlanningManager's create mode.
                        setSelectedPlanId('new');
                        setActiveModule('planning');
                        setView('detail');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                >
                    <Plus size={20} /> Nova Obra
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar obras por nome, cliente ou endereço..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    />
                </div>
                <button className="p-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors relative">
                    <Filter size={20} />
                </button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.filter(p =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                ).map(plan => (
                    <div
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan.id)}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:bg-emerald-600 transition-colors"></div>

                        <div className="flex justify-between items-start mb-4 pl-3">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors truncate">{plan.name}</h3>
                                <p className="text-sm text-slate-500 font-medium truncate">{plan.client_name || 'Cliente não informado'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${plan.status === 'Concluído' ? 'bg-green-100 text-green-700' :
                                    plan.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {plan.status}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDuplicatePlan(plan.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Duplicar Projeto"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeletePlan(plan.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Excluir Projeto"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pl-3 space-y-3 mb-6">
                            <div className="flex items-center text-sm text-slate-500">
                                <Calendar size={14} className="mr-2" />
                                <span>Criado em {new Date(plan.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                                <HardHat size={14} className="mr-2" />
                                <span>{plan.type || 'Geral'}</span>
                            </div>
                        </div>

                        <div className="pl-3 border-t border-slate-100 pt-4 flex justify-between items-center text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase">Orçado</span>
                                <span className="font-bold text-slate-700">R$ {(plan.total_real_cost || 0).toFixed(2)}</span>
                            </div>
                            {/* Future: Show Realized Cost here too if we link it */}
                            <div className="flex items-center text-emerald-600 font-bold group-hover:translate-x-1 transition-transform">
                                Abrir <ArrowRight size={16} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <Building2 size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhuma obra encontrada. Comece criando um novo planejamento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedWorksManager;
