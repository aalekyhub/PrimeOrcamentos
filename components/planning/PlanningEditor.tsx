import React, { useMemo, useState } from 'react';
import {
    Building2,
    Truck,
    HardHat,
    FileText,
    Save,
    ArrowRight,
    PieChart,
    RefreshCw,
    Check,
    AlertCircle
} from 'lucide-react';
import { useNotify } from '../ToastProvider';
import { db } from '../../services/db';
import { DataTab } from './tabs/DataTab';
import { ServicesTab } from './tabs/ServicesTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { SummaryTab } from './tabs/SummaryTab';
import {
    PlanningHeader,
    PlannedService,
    PlannedMaterial,
    PlannedLabor,
    PlannedIndirect,
    PlanTax,
    Customer,
    MainTab,
    ResourceTab,
} from './types';
import { AddServiceForm } from './forms/AddServiceForm';
import { AddMaterialForm } from './forms/AddMaterialForm';
import { AddLaborForm } from './forms/AddLaborForm';
import { AddIndirectForm } from './forms/AddIndirectForm';

interface PlanningCalculations {
    totalMaterial: number;
    totalLabor: number;
    totalIndirect: number;
    totalTaxes?: number;
    totalTax?: number;
    totalGeneral: number;
}

interface NewServiceInput {
    description: string;
    quantity: number | string;
    unit: string;
    unit_material_cost: number | string;
    unit_labor_cost: number | string;
    unit_indirect_cost?: number | string;
    [key: string]: any;
}

interface NewMaterialInput {
    material_name: string;
    quantity: number | string;
    unit: string;
    unit_cost: number | string;
    [key: string]: any;
}

interface NewLaborInput {
    role: string;
    quantity: number | string;
    unit?: string;
    unit_cost: number | string;
    cost_type?: string;
    [key: string]: any;
}

interface NewIndirectInput {
    category: string;
    description?: string;
    value: number | string;
    [key: string]: any;
}

interface NewTaxInput {
    name: string;
    rate?: number | string;
    value?: number | string;
    [key: string]: any;
}

interface PlanningEditorProps {
    currentPlan: PlanningHeader | null;
    services: PlannedService[];
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    customers: Customer[];
    calculations: PlanningCalculations;
    onUpdatePlan: (plan: PlanningHeader) => void;
    onUpdateServices: (services: PlannedService[]) => void;
    onUpdateMaterials: (materials: PlannedMaterial[]) => void;
    onUpdateLabor: (labor: PlannedLabor[]) => void;
    onUpdateIndirects: (indirects: PlannedIndirect[]) => void;
    onUpdateTaxes: (taxes: PlanTax[]) => void;
    onDeleteService: (id: string) => void;
    onDeleteMaterial: (id: string) => void;
    onDeleteLabor: (id: string) => void;
    onDeleteIndirect: (id: string) => void;
    onDeleteTax: (id: string) => void;
    onDeleteMultipleServices?: (ids: string[]) => void;
    onDeleteMultipleMaterials?: (ids: string[]) => void;
    onDeleteMultipleLabor?: (ids: string[]) => void;
    onDeleteMultipleIndirects?: (ids: string[]) => void;
    onSave: () => void;
    onGenerateBudget: () => void;
    onBack: () => void;
    embeddedMode: boolean;
    onShowPreview: () => void;
}

// Helpers
const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const normalized = value
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const buildSafeFileName = (value?: string): string => {
    const name = String(value || 'planejamento-obra')
        .replace(/\.pdf$/i, '')
        .replace(/[\\/:*?"<>|]+/g, '')
        .trim();

    return `${name || 'planejamento-obra'}.pdf`;
};

const calculateServiceTotal = (service: {
    quantity: unknown;
    unit_material_cost: unknown;
    unit_labor_cost: unknown;
    unit_indirect_cost?: unknown;
}): number => {
    const q = toNumber(service.quantity);
    const m = toNumber(service.unit_material_cost);
    const l = toNumber(service.unit_labor_cost);
    const i = toNumber(service.unit_indirect_cost);
    return q * (m + l + i);
};

const calculateMaterialTotal = (material: {
    quantity: unknown;
    unit_cost: unknown;
}): number => {
    return toNumber(material.quantity) * toNumber(material.unit_cost);
};

const calculateLaborTotal = (item: {
    quantity: unknown;
    unit_cost: unknown;
}): number => {
    return toNumber(item.quantity) * toNumber(item.unit_cost);
};

export const PlanningEditor: React.FC<PlanningEditorProps> = ({
    currentPlan,
    services,
    materials,
    labor,
    indirects,
    taxes,
    customers,
    calculations,
    onUpdatePlan,
    onUpdateServices,
    onUpdateMaterials,
    onUpdateLabor,
    onUpdateIndirects,
    onUpdateTaxes,
    onDeleteService,
    onDeleteMaterial,
    onDeleteLabor,
    onDeleteIndirect,
    onDeleteTax,
    onDeleteMultipleServices,
    onDeleteMultipleMaterials,
    onDeleteMultipleLabor,
    onDeleteMultipleIndirects,
    onSave,
    onGenerateBudget,
    onBack,
    embeddedMode,
    onShowPreview,
}) => {
    const [activeTab, setActiveTab] = useState<MainTab>('dados');
    const [resourceTab, setResourceTab] = useState<ResourceTab>('material');
    const { notify } = useNotify();



    if (!currentPlan) return null;

    const handleAddLabor = (newLabor: Omit<PlannedLabor, 'id' | 'plan_id' | 'total_cost'>) => {
        const item = {
            ...newLabor,
            id: db.generateId('LAB'),
            plan_id: currentPlan.id,
            total_cost: (newLabor.quantity || 0) * (newLabor.unit_cost || 0)
        } as PlannedLabor;
        const nextLabor = [...labor, item];
        onUpdateLabor(nextLabor);
        db.saveLocal('serviflow_plan_labor', nextLabor);
    };

    const handleAddMaterial = (newMat: Omit<PlannedMaterial, 'id' | 'plan_id' | 'total_cost'>) => {
        const item = {
            ...newMat,
            id: db.generateId('MAT'),
            plan_id: currentPlan.id,
            total_cost: (newMat.quantity || 0) * (newMat.unit_cost || 0)
        } as PlannedMaterial;
        const nextMaterials = [...materials, item];
        onUpdateMaterials(nextMaterials);
        db.saveLocal('serviflow_plan_materials', nextMaterials);
    };

    const handleAddService = (newServ: Omit<PlannedService, 'id' | 'plan_id' | 'total_cost'>) => {
        const item = {
            ...newServ,
            id: db.generateId('SERV'),
            plan_id: currentPlan.id,
            total_cost: (newServ.quantity || 0) * ((newServ.unit_material_cost || 0) + (newServ.unit_labor_cost || 0) + (newServ.unit_indirect_cost || 0))
        } as PlannedService;
        const nextServices = [...services, item];
        onUpdateServices(nextServices);
        db.saveLocal('serviflow_plan_services', nextServices);
    };

    const handleAddIndirect = (newInd: Omit<PlannedIndirect, 'id' | 'plan_id'>) => {
        const item = {
            ...newInd,
            id: db.generateId('IND'),
            plan_id: currentPlan.id
        };
        const nextIndirects = [...indirects, item];
        onUpdateIndirects(nextIndirects);
        db.saveLocal('serviflow_plan_indirects', nextIndirects);
    };

    const handleAddTax = (taxData: NewTaxInput) => {
        const item = {
            id: db.generateId('TAX'),
            plan_id: currentPlan.id,
            ...taxData,
            rate: toNumber(taxData.rate),
            value: toNumber(taxData.value),
        } as PlanTax;

        const nextTaxes = [...taxes, item];
        onUpdateTaxes(nextTaxes);
        db.saveLocal('serviflow_plan_taxes', nextTaxes);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl h-[calc(100vh-140px)] flex flex-col border dark:border-slate-800 overflow-hidden">
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-4">
                        {!embeddedMode && (
                            <button
                                onClick={onBack}
                                className="text-blue-400 hover:text-blue-600 p-1"
                                type="button"
                            >
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        )}

                        <div>
                            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                <HardHat className="text-blue-600 dark:text-blue-400" />
                                {String(currentPlan.name || '').toUpperCase()}
                            </h2>
                            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">
                                {currentPlan.status} • GESTÃO DE PLANEJAMENTO
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-900/20"
                            >
                                <Save size={16} />
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'dados', label: 'Dados da Obra', icon: FileText },
                        { id: 'servicos', label: 'Serviços', icon: Building2 },
                        { id: 'recursos', label: 'Gastos Detalhados', icon: Truck },
                        { id: 'resumo', label: 'Resumo de Custo', icon: PieChart },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as MainTab)}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Sticky Add Forms based on Tab */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'servicos' && (
                            <AddServiceForm onAdd={handleAddService} planId={currentPlan.id} />
                        )}
                        {activeTab === 'recursos' && (
                            <>
                                <div className="flex gap-1.5 mb-4 justify-center">
                                    {[
                                        { id: 'material', label: 'Materiais' },
                                        { id: 'mo', label: 'Mão de Obra' },
                                        { id: 'indireto', label: 'Indiretos' },
                                        { id: 'impostos', label: 'Impostos' },
                                    ].map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setResourceTab(r.id as ResourceTab)}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${resourceTab === r.id
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-50'
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                                {resourceTab === 'material' && (
                                    <AddMaterialForm planId={currentPlan.id} onAdd={handleAddMaterial} />
                                )}
                                {resourceTab === 'mo' && (
                                    <AddLaborForm planId={currentPlan.id} onAdd={handleAddLabor} />
                                )}
                                {resourceTab === 'indireto' && (
                                    <AddIndirectForm planId={currentPlan.id} onAdd={handleAddIndirect} />
                                )}
                                {resourceTab === 'impostos' && (
                                    <div className="flex justify-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defina as alíquotas abaixo</p>
                                    </div>
                                )}
                            </>
                        )}
                        {activeTab === 'resumo' && (
                            <div className="flex justify-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Resumo Geral Financeiro</p>
                            </div>
                        )}
                        {activeTab === 'dados' && (
                            <div className="flex justify-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Edite os dados básicos da obra</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-auto">
                {activeTab === 'dados' && (
                    <DataTab
                        plan={currentPlan}
                        customers={customers}
                        onUpdatePlan={onUpdatePlan}
                    />
                )}

                {activeTab === 'servicos' && (
                    <ServicesTab
                        services={services}
                        onAddService={handleAddService}
                        onUpdateService={(updatedService: PlannedService) =>
                            onUpdateServices(
                                services.map((service) =>
                                    service.id === updatedService.id
                                        ? {
                                            ...updatedService,
                                            total_cost: calculateServiceTotal(updatedService),
                                        }
                                        : service
                                )
                            )
                        }
                        onDeleteService={onDeleteService}
                        onDeleteMultipleServices={onDeleteMultipleServices}
                        onReorderServices={onUpdateServices}
                        planId={currentPlan.id}
                    />
                )}

                {activeTab === 'recursos' && (
                    <ResourcesTab
                        planId={currentPlan.id}
                        materials={materials}
                        labor={labor}
                        indirects={indirects}
                        taxes={taxes}
                        calculations={calculations}
                        activeResTab={resourceTab}
                        setActiveResTab={setResourceTab}
                        onAddMaterial={handleAddMaterial}
                        onAddLabor={handleAddLabor}
                        onAddIndirect={handleAddIndirect}
                        onAddTax={handleAddTax}
                        onUpdateMaterials={onUpdateMaterials}
                        onUpdateLabor={onUpdateLabor}
                        onUpdateIndirects={onUpdateIndirects}
                        onUpdateTaxes={onUpdateTaxes}
                        onDeleteMaterial={onDeleteMaterial}
                        onDeleteLabor={onDeleteLabor}
                        onDeleteIndirect={onDeleteIndirect}
                        onDeleteMultipleMaterials={onDeleteMultipleMaterials}
                        onDeleteMultipleLabor={onDeleteMultipleLabor}
                        onDeleteMultipleIndirects={onDeleteMultipleIndirects}
                        onDeleteTax={onDeleteTax}
                    />
                )}

                {activeTab === 'resumo' && (
                    <SummaryTab
                        calculations={calculations}
                        onGenerateBudget={onGenerateBudget}
                        onPreviewReport={onShowPreview}
                        hasGenerateBudget={!!onGenerateBudget}
                    />
                )}
            </div>
        </div>
    );
};