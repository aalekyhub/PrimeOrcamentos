import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, Users, Truck, HardHat, FileText,
    Plus, Trash2, Save, ChevronRight, Calculator,
    PieChart, ArrowRight, DollarSign
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import {
    PlanningHeader, PlannedService, PlannedMaterial,
    PlannedLabor, PlannedIndirect, Customer
} from '../types';

interface Props {
    customers: Customer[];
    onGenerateBudget: (plan: PlanningHeader, totalCost: number) => void;
}

const PlanningManager: React.FC<Props> = ({ customers, onGenerateBudget }) => {
    // State
    const [plans, setPlans] = useState<PlanningHeader[]>([]);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotify();

    // Active Plan Data
    const [currentPlan, setCurrentPlan] = useState<PlanningHeader | null>(null);
    const [services, setServices] = useState<PlannedService[]>([]);
    const [materials, setMaterials] = useState<PlannedMaterial[]>([]);
    const [labor, setLabor] = useState<PlannedLabor[]>([]);
    const [indirects, setIndirects] = useState<PlannedIndirect[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto'>('material');

    // Load plans on mount
    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        // In a real app, this comes from App.tsx props or a global store, 
        // but for now let's try to load from local storage or db sync
        // For this module to work isolated, we might need to fetch manually or rely on App passing props.
        // Given the constraints, I will assume we fetch from DB/Local for now or manage local state.
        // Ideally, App.tsx should manage this state like 'orders'.
        // For now, I'll implement local fetching to get started.
        const localPlans = db.load('serviflow_plans', []);
        setPlans(localPlans);
    };

    const handleCreatePlan = () => {
        const newPlan: PlanningHeader = {
            id: db.generateId('PLAN'),
            name: 'Nova Obra',
            client_id: '',
            address: '',
            type: 'Reforma',
            status: 'Planejamento',
            created_at: new Date().toISOString()
        };
        setPlans([newPlan, ...plans]);
        setActivePlanId(newPlan.id);
        setCurrentPlan(newPlan);
        setServices([]);
        setMaterials([]);
        setLabor([]);
        setIndirects([]);
        setActiveTab('dados');
    };

    const handleSave = async () => {
        if (!currentPlan) return;
        setLoading(true);

        // Calculate Totals
        const totalMat = materials.reduce((acc, m) => acc + (m.total_cost || 0), 0) +
            services.reduce((acc, s) => acc + (s.unit_material_cost * s.quantity), 0); // Simplified aggregation

        // Update the current plan object with new totals (optional, but good for summary)
        // For now just saving the header info

        const updatedPlans = plans.map(p => p.id === currentPlan.id ? currentPlan : p);

        // Save to DB
        await db.save('serviflow_plans', updatedPlans);
        await db.save('serviflow_plan_services', services);
        // Note: In a real app we would save materials/labor/indirects too

        // Update local state so the list reflects changes immediately
        setPlans(updatedPlans);

        notify("Planejamento salvo com sucesso!");
        setLoading(false);
    };

    // Calculations
    const totalMaterial = useMemo(() => materials.reduce((acc, i) => acc + i.total_cost, 0), [materials]);
    const totalLabor = useMemo(() => labor.reduce((acc, i) => acc + i.total_cost, 0), [labor]);
    const totalIndirect = useMemo(() => indirects.reduce((acc, i) => acc + i.value, 0), [indirects]);
    const totalGeneral = totalMaterial + totalLabor + totalIndirect;

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {/* Header / List */}
            {!activePlanId ? (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-slate-800">Planejamento de Obras</h1>
                        <button onClick={handleCreatePlan} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                            <Plus size={20} /> Nova Obra
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map(plan => (
                            <div key={plan.id}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 transition-all group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg text-slate-800">{plan.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${plan.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {plan.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">{plan.type}</p>
                                <div className="flex justify-between text-xs text-slate-400 mb-4">
                                    <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                                    <span>ID: {plan.id}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => { setActivePlanId(plan.id); setCurrentPlan(plan); }}
                                        className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors w-full"
                                    >
                                        Editar Planejamento
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl min-h-[80vh] flex flex-col">
                    {/* Editor Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActivePlanId(null)} className="text-slate-400 hover:text-slate-600">
                                <ArrowRight className="rotate-180" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <HardHat className="text-blue-600" />
                                    {currentPlan?.name}
                                </h2>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{currentPlan?.type} • CUSTO REAL</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-900">
                                <Save size={16} /> Salvar
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 px-6">
                        {[
                            { id: 'dados', label: 'Dados da Obra', icon: FileText },
                            { id: 'servicos', label: 'Serviços', icon: Building2 },
                            { id: 'recursos', label: 'Recursos Detalhados', icon: Truck },
                            { id: 'resumo', label: 'Resumo de Custo', icon: PieChart },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-8 flex-1 bg-slate-50/50">
                        {activeTab === 'dados' && currentPlan && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Obra</label>
                                        <input
                                            type="text"
                                            value={currentPlan.name}
                                            onChange={e => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                        <select
                                            value={currentPlan.type}
                                            onChange={e => setCurrentPlan({ ...currentPlan, type: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        >
                                            <option>Reforma</option>
                                            <option>Manutenção</option>
                                            <option>Construção</option>
                                            <option>Retrofit</option>
                                            <option>Instalação</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Customer Select */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                    <select
                                        value={currentPlan.client_id}
                                        onChange={e => setCurrentPlan({ ...currentPlan, client_id: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                    >
                                        <option value="">Selecione...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço</label>
                                    <input
                                        type="text"
                                        value={currentPlan.address}
                                        onChange={e => setCurrentPlan({ ...currentPlan, address: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        placeholder="Local da execução"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'servicos' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={18} /> Adicionar Serviço</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                            <input type="text" id="svc_desc" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Pintura de Parede" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Un</label>
                                            <input type="text" id="svc_unit" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="m²" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                            <input type="number" id="svc_qty" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit. Material</label>
                                            <input type="number" id="svc_mat" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit. M.O.</label>
                                            <input type="number" id="svc_lab" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <button
                                                onClick={() => {
                                                    const desc = (document.getElementById('svc_desc') as HTMLInputElement).value;
                                                    const unit = (document.getElementById('svc_unit') as HTMLInputElement).value;
                                                    const qty = parseFloat((document.getElementById('svc_qty') as HTMLInputElement).value) || 0;
                                                    const mat = parseFloat((document.getElementById('svc_mat') as HTMLInputElement).value) || 0;
                                                    const lab = parseFloat((document.getElementById('svc_lab') as HTMLInputElement).value) || 0;

                                                    if (!desc) return notify("Descrição obrigatória", "error");

                                                    const newSvc: PlannedService = {
                                                        id: db.generateId('SVC'),
                                                        plan_id: currentPlan?.id || '',
                                                        description: desc,
                                                        unit,
                                                        quantity: qty,
                                                        unit_material_cost: mat,
                                                        unit_labor_cost: lab,
                                                        unit_indirect_cost: 0,
                                                        total_cost: qty * (mat + lab)
                                                    };
                                                    setServices([...services, newSvc]);

                                                    // Reset fields
                                                    (document.getElementById('svc_desc') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_qty') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_mat') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_lab') as HTMLInputElement).value = '';
                                                }}
                                                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-sm flex items-center justify-center gap-1"
                                            >
                                                <Plus size={16} /> Adicionar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {services.map(svc => (
                                        <div key={svc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-300">
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">{svc.description}</p>
                                                <p className="text-xs text-slate-500">
                                                    {svc.quantity} {svc.unit} x (Mat: {svc.unit_material_cost.toFixed(2)} + MO: {svc.unit_labor_cost.toFixed(2)})
                                                </p>
                                            </div>
                                            <div className="text-right mr-4">
                                                <p className="text-sm font-bold text-slate-800">R$ {svc.total_cost.toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => setServices(services.filter(s => s.id !== svc.id))}
                                                className="text-slate-300 hover:text-red-500 p-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {services.length === 0 && (
                                        <div className="text-center py-10 text-slate-400">Nenhum serviço planejado ainda.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div>
                                <div className="flex gap-2 mb-6 justify-center">
                                    {[{ id: 'material', label: 'Materiais' }, { id: 'mo', label: 'Mão de Obra' }, { id: 'indireto', label: 'Indiretos' }].map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setResourceTab(r.id as any)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${resourceTab === r.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>

                                {/* MATERIALS TAB */}
                                {resourceTab === 'material' && (
                                    <div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-5">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Material</label>
                                                    <input type="text" id="mat_name" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Cimento CP-II" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                                    <input type="number" id="mat_qty" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                                                    <input type="number" id="mat_cost" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <button
                                                        onClick={() => {
                                                            const name = (document.getElementById('mat_name') as HTMLInputElement).value;
                                                            const qty = parseFloat((document.getElementById('mat_qty') as HTMLInputElement).value) || 0;
                                                            const cost = parseFloat((document.getElementById('mat_cost') as HTMLInputElement).value) || 0;
                                                            if (!name) return notify("Nome obrigatório", "error");

                                                            setMaterials([...materials, {
                                                                id: db.generateId('MAT'),
                                                                material_name: name,
                                                                quantity: qty,
                                                                unit_cost: cost,
                                                                total_cost: qty * cost
                                                            }]);
                                                            (document.getElementById('mat_name') as HTMLInputElement).value = '';
                                                            (document.getElementById('mat_qty') as HTMLInputElement).value = '';
                                                            (document.getElementById('mat_cost') as HTMLInputElement).value = '';
                                                        }}
                                                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-sm"
                                                    >
                                                        Adicionar Material
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {materials.map(m => (
                                                <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                    <span>{m.quantity}x <b>{m.material_name}</b> (R$ {m.unit_cost.toFixed(2)})</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold">R$ {m.total_cost.toFixed(2)}</span>
                                                        <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => setMaterials(materials.filter(x => x.id !== m.id))} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* LABOR TAB */}
                                {resourceTab === 'mo' && (
                                    <div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-4">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função</label>
                                                    <input type="text" id="mo_role" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Pedreiro" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                                    <select id="mo_type" className="w-full p-2 border border-slate-200 rounded text-sm">
                                                        <option value="Diária">Diária</option>
                                                        <option value="Hora">Hora</option>
                                                        <option value="Empreitada">Empreitada</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd (Dias/H)</label>
                                                    <input type="number" id="mo_qty" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                                                    <input type="number" id="mo_cost" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <button
                                                        onClick={() => {
                                                            const role = (document.getElementById('mo_role') as HTMLInputElement).value;
                                                            const type = (document.getElementById('mo_type') as HTMLInputElement).value as any;
                                                            const qty = parseFloat((document.getElementById('mo_qty') as HTMLInputElement).value) || 0;
                                                            const cost = parseFloat((document.getElementById('mo_cost') as HTMLInputElement).value) || 0;
                                                            if (!role) return notify("Função obrigatória", "error");

                                                            setLabor([...labor, {
                                                                id: db.generateId('LBR'),
                                                                role,
                                                                cost_type: type,
                                                                quantity: qty,
                                                                unit_cost: cost,
                                                                charges_percent: 0,
                                                                total_cost: qty * cost
                                                            }]);
                                                            (document.getElementById('mo_role') as HTMLInputElement).value = '';
                                                            (document.getElementById('mo_qty') as HTMLInputElement).value = '';
                                                        }}
                                                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-sm"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {labor.map(l => (
                                                <div key={l.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                    <span>{l.quantity} {l.cost_type}(s) de <b>{l.role}</b></span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold">R$ {l.total_cost.toFixed(2)}</span>
                                                        <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => setLabor(labor.filter(x => x.id !== l.id))} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* INDIRECTS TAB */}
                                {resourceTab === 'indireto' && (
                                    <div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-3">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                                    <select id="ind_cat" className="w-full p-2 border border-slate-200 rounded text-sm">
                                                        <option>Transporte</option>
                                                        <option>Alimentação</option>
                                                        <option>EPI</option>
                                                        <option>Equipamentos</option>
                                                        <option>Taxas</option>
                                                        <option>Outros</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-6">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                                    <input type="text" id="ind_desc" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Combustível ida/volta" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                                    <input type="number" id="ind_val" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <button
                                                        onClick={() => {
                                                            const cat = (document.getElementById('ind_cat') as HTMLInputElement).value;
                                                            const desc = (document.getElementById('ind_desc') as HTMLInputElement).value;
                                                            const val = parseFloat((document.getElementById('ind_val') as HTMLInputElement).value) || 0;

                                                            setIndirects([...indirects, {
                                                                id: db.generateId('IND'),
                                                                category: cat,
                                                                description: desc,
                                                                value: val
                                                            }]);
                                                            (document.getElementById('ind_desc') as HTMLInputElement).value = '';
                                                            (document.getElementById('ind_val') as HTMLInputElement).value = '';
                                                        }}
                                                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-sm flex justify-center"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {indirects.map(i => (
                                                <div key={i.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                    <span>[{i.category}] <b>{i.description}</b></span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold">R$ {i.value.toFixed(2)}</span>
                                                        <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => setIndirects(indirects.filter(x => x.id !== i.id))} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'resumo' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Materiais</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalMaterial.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Mão de Obra</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalLabor.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Indiretos</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalIndirect.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
                                    <div>
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Custo Real Total</p>
                                        <p className="text-4xl font-bold">R$ {totalGeneral.toFixed(2)}</p>
                                    </div>
                                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105">
                                        <Calculator size={20} /> Gerar Orçamento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningManager;
