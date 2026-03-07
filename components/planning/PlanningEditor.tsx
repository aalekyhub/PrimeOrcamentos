import React, { useMemo, useState } from 'react';
import {
    Building2,
    Truck,
    HardHat,
    FileText,
    Save,
    ArrowRight,
    PieChart,
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
} from './types';
import { buildReportHtml, PLANNING_THEME } from '../../services/reportPdfService';

interface PlanningCalculations {
    totalMaterial: number;
    totalLabor: number;
    totalIndirect: number;
    totalTax: number;
    totalGeneral: number;
}

interface CompanyProfileLite {
    name: string;
    cnpj?: string;
    phone?: string;
    logo?: string;
    logoSize?: number;
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
    onSave: () => void;
    onGenerateBudget: () => void;
    onBack: () => void;
    embeddedMode: boolean;
    onShowPreview: (title: string, html: string, filename: string) => void;
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
    onSave,
    onGenerateBudget,
    onBack,
    embeddedMode,
    onShowPreview,
}) => {
    const [activeTab, setActiveTab] = useState<MainTab>('dados');
    const { notify } = useNotify();

    const company = useMemo<CompanyProfileLite>(() => {
        const loaded = db.load('serviflow_company', {
            name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: '12.345.678/0001-90',
            logoSize: 70,
        });

        return {
            name: loaded?.name || 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: loaded?.cnpj || '',
            phone: loaded?.phone || '',
            logo: loaded?.logo || '',
            logoSize: toNumber(loaded?.logoSize) || 70,
        };
    }, []);

    if (!currentPlan) return null;

    const handleAddService = (serviceData: NewServiceInput) => {
        const quantity = toNumber(serviceData.quantity);
        const unitMaterial = toNumber(serviceData.unit_material_cost);
        const unitLabor = toNumber(serviceData.unit_labor_cost);
        const unitIndirect = toNumber(serviceData.unit_indirect_cost);

        const newService: PlannedService = {
            id: db.generateId('SVC'),
            plan_id: currentPlan.id,
            ...serviceData,
            quantity,
            unit_material_cost: unitMaterial,
            unit_labor_cost: unitLabor,
            unit_indirect_cost: unitIndirect,
            total_cost: quantity * (unitMaterial + unitLabor + unitIndirect),
        } as PlannedService;

        onUpdateServices([...services, newService]);
    };

    const handleAddMaterial = (materialData: NewMaterialInput) => {
        const quantity = toNumber(materialData.quantity);
        const unitCost = toNumber(materialData.unit_cost);

        const newMaterial: PlannedMaterial = {
            id: db.generateId('MAT'),
            plan_id: currentPlan.id,
            ...materialData,
            quantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
        } as PlannedMaterial;

        onUpdateMaterials([...materials, newMaterial]);
    };

    const handleAddLabor = (laborData: NewLaborInput) => {
        const quantity = toNumber(laborData.quantity);
        const unitCost = toNumber(laborData.unit_cost);

        const newLabor: PlannedLabor = {
            id: db.generateId('LBR'),
            plan_id: currentPlan.id,
            ...laborData,
            quantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
        } as PlannedLabor;

        onUpdateLabor([...labor, newLabor]);
    };

    const handleAddIndirect = (indirectData: NewIndirectInput) => {
        const newIndirect: PlannedIndirect = {
            id: db.generateId('IND'),
            plan_id: currentPlan.id,
            ...indirectData,
            value: toNumber(indirectData.value),
        } as PlannedIndirect;

        onUpdateIndirects([...indirects, newIndirect]);
    };

    const handleAddTax = (taxData: NewTaxInput) => {
        const newTax: PlanTax = {
            id: db.generateId('TAX'),
            plan_id: currentPlan.id,
            ...taxData,
            rate: toNumber(taxData.rate),
            value: toNumber(taxData.value),
        } as PlanTax;

        onUpdateTaxes([...taxes, newTax]);
    };

    const handlePreviewReport = () => {
        if (!currentPlan) return;

        const html = buildReportHtml(
            currentPlan,
            customers,
            services,
            materials,
            labor,
            indirects,
            taxes,
            {
                totalMaterial: toNumber(calculations.totalMaterial),
                totalLabor: toNumber(calculations.totalLabor),
                totalIndirect: toNumber(calculations.totalIndirect),
                totalTax: toNumber(calculations.totalTax),
                totalGeneral: toNumber(calculations.totalGeneral),
            },
            company,
            PLANNING_THEME
        );

        onShowPreview(
            'Planejamento de Obra',
            html,
            buildSafeFileName(currentPlan.name || 'planejamento-obra')
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[80vh] flex flex-col border dark:border-slate-800 overflow-hidden">
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
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
                        <button
                            type="button"
                            onClick={() => {
                                notify('Sincronização com a nuvem disponível conforme configuração do sistema.', 'info');
                            }}
                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-200 transition-all border border-blue-200 dark:border-blue-800"
                        >
                            <ArrowRight className="rotate-180" size={16} />
                            Sincronizar
                        </button>

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
                        onDeleteTax={onDeleteTax}
                    />
                )}

                {activeTab === 'resumo' && (
                    <SummaryTab
                        calculations={calculations}
                        onGenerateBudget={onGenerateBudget}
                        onPreviewReport={handlePreviewReport}
                        hasGenerateBudget={!!onGenerateBudget}
                    />
                )}
            </div>
        </div>
    );
};