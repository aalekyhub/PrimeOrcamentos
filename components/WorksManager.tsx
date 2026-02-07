import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, Users, Truck, HardHat, FileText,
    Plus, Trash2, Save, ChevronRight, Calculator,
    PieChart, ArrowRight, DollarSign, Calendar
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import {
    WorkHeader, WorkService, WorkMaterial,
    WorkLabor, WorkIndirect, Customer
} from '../types';

interface Props {
    customers: Customer[];
}

const WorksManager: React.FC<Props> = ({ customers }) => {
    // State
    const [works, setWorks] = useState<WorkHeader[]>([]);
    const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotify();

    // Active Work Data
    const [currentWork, setCurrentWork] = useState<WorkHeader | null>(null);
    const [services, setServices] = useState<WorkService[]>([]);
    const [materials, setMaterials] = useState<WorkMaterial[]>([]);
    const [labor, setLabor] = useState<WorkLabor[]>([]);
    const [indirects, setIndirects] = useState<WorkIndirect[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto'>('material');

    // Load works on mount
    useEffect(() => {
        loadWorks();
    }, []);

    const loadWorks = async () => {
        const localWorks = db.load('serviflow_works', []);
        setWorks(localWorks);
    };

    const handleCreateWork = () => {
        const newWork: WorkHeader = {
            id: db.generateId('OBRA'),
            name: 'Nova Obra',
            client_id: '',
            address: '',
            status: 'Em Andamento',
            start_date: new Date().toISOString()
        };
        setWorks([newWork, ...works]);
        setActiveWorkId(newWork.id);
        setCurrentWork(newWork);
        setServices([]);
        setMaterials([]);
        setLabor([]);
        setIndirects([]);
        setActiveTab('dados');
    };

    const handleSave = async () => {
        if (!currentWork) return;
        setLoading(true);

        // Calculate Totals Realized
        const totalMat = materials.reduce((acc, m) => acc + (m.total_cost || 0), 0) +
            services.reduce((acc, s) => acc + (Number(s.unit_material_cost) * Number(s.quantity)), 0);

        const currentTotal = totalMat +
            labor.reduce((acc, i) => acc + i.total_cost, 0) +
            indirects.reduce((acc, i) => acc + i.value, 0);

        const updatedWork = {
            ...currentWork,
            total_real_cost: currentTotal,
            total_material_cost: totalMat
            // In a real app we'd update other totals too
        };

        const updatedWorks = works.map(w => w.id === currentWork.id ? updatedWork : w);

        // Save to DB
        await db.save('serviflow_works', updatedWorks);
        // Note: Save sub-lists separately in real app

        setWorks(updatedWorks);

        notify("Obra atualizada com sucesso!", "success");
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
            {!activeWorkId ? (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-emerald-800">Gestão de Obras (Realizado)</h1>
                        <button onClick={handleCreateWork} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700">
                            <Plus size={20} /> Nova Obra
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {works.map(work => (
                            <div key={work.id}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-400 transition-all group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg text-slate-800">{work.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${work.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                                        {work.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 truncate">{work.address || 'Sem endereço'}</p>
                                <div className="flex justify-between text-xs text-slate-400 mb-4">
                                    <span>{new Date(work.start_date).toLocaleDateString()}</span>
                                    <span>ID: {work.id}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => { setActiveWorkId(work.id); setCurrentWork(work); }}
                                        className="text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors w-full"
                                    >
                                        Gerenciar Obra
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl min-h-[80vh] flex flex-col">
                    {/* Editor Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 rounded-t-2xl">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveWorkId(null)} className="text-emerald-400 hover:text-emerald-600">
                                <ArrowRight className="rotate-180" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                                    <HardHat className="text-emerald-600" />
                                    {currentWork?.name}
                                </h2>
                                <p className="text-xs text-emerald-600 uppercase tracking-widest font-semibold flex items-center gap-1">
                                    <Calendar size={12} /> Início: {new Date(currentWork?.start_date || '').toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} className="px-4 py-2 bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-emerald-800 shadow-md">
                                <Save size={16} /> Salvar Alterações
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 px-6">
                        {[
                            { id: 'dados', label: 'Dados da Obra', icon: FileText },
                            { id: 'servicos', label: 'Serviços Realizados', icon: Building2 },
                            { id: 'recursos', label: 'Gastos Detalhados', icon: Truck },
                            { id: 'resumo', label: 'Resumo Financeiro', icon: PieChart },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-8 flex-1 bg-slate-50/50">
                        {activeTab === 'dados' && currentWork && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Obra</label>
                                        <input
                                            type="text"
                                            value={currentWork.name}
                                            onChange={e => setCurrentWork({ ...currentWork, name: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                        <select
                                            value={currentWork.status}
                                            onChange={e => setCurrentWork({ ...currentWork, status: e.target.value as any })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none"
                                        >
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Pausada">Pausada</option>
                                            <option value="Concluída">Concluída</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Customer Select */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                    <select
                                        value={currentWork.client_id}
                                        onChange={e => setCurrentWork({ ...currentWork, client_id: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                    >
                                        <option value="">Selecione...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço da Obra</label>
                                    <input
                                        type="text"
                                        value={currentWork.address}
                                        onChange={e => setCurrentWork({ ...currentWork, address: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        placeholder="Local da execução"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'servicos' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={18} /> Lançar Serviço Realizado</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                            <input type="text" id="svc_desc" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Pintura Realizada" />
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
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">R$ Mat (Real)</label>
                                            <input type="number" id="svc_mat" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">R$ M.O. (Real)</label>
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

                                                    const newSvc: WorkService = {
                                                        id: db.generateId('WSVC'),
                                                        work_id: currentWork?.id || '',
                                                        description: desc,
                                                        unit,
                                                        quantity: qty,
                                                        unit_material_cost: mat, // Actual cost!
                                                        unit_labor_cost: lab,     // Actual cost!
                                                        unit_indirect_cost: 0,
                                                        total_cost: qty * (mat + lab),
                                                        status: 'Concluído'
                                                    };
                                                    setServices([...services, newSvc]);

                                                    // Reset
                                                    (document.getElementById('svc_desc') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_qty') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_mat') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_lab') as HTMLInputElement).value = '';
                                                }}
                                                className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold text-sm flex items-center justify-center gap-1"
                                            >
                                                <Plus size={16} /> Lançar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {services.map(svc => (
                                        <div key={svc.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center group">
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">{svc.description}</p>
                                                <p className="text-xs text-slate-500">
                                                    {svc.quantity} {svc.unit} • Mat: R$ {svc.unit_material_cost.toFixed(2)} • M.O: R$ {svc.unit_labor_cost.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <p className="font-bold text-emerald-600">R$ {svc.total_cost.toFixed(2)}</p>
                                                <button onClick={() => setServices(services.filter(s => s.id !== svc.id))} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {services.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum serviço lançado ainda.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resumo' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Gasto com Materiais</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalMaterial.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Gasto com Mão de Obra</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalLabor.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Custos Indiretos</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalIndirect.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="bg-emerald-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
                                    <div>
                                        <p className="text-emerald-200 text-sm font-bold uppercase tracking-widest mb-1">Custo Total Realizado</p>
                                        <p className="text-4xl font-bold">R$ {totalGeneral.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-emerald-300">Valores consolidados da execução</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksManager;
