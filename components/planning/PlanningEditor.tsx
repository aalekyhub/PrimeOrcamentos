import React, { useState } from 'react';
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

interface PlanningEditorProps {
    currentPlan: PlanningHeader | null;
    services: PlannedService[];
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    customers: Customer[];
    calculations: any;
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

    if (!currentPlan) return null;

    const handleAddService = (serviceData: any) => {
        const newService: PlannedService = {
            id: db.generateId('SVC'),
            plan_id: currentPlan.id,
            ...serviceData,
            total_cost: serviceData.quantity * (serviceData.unit_material_cost + serviceData.unit_labor_cost),
        };
        onUpdateServices([...services, newService]);
    };

    const handleAddMaterial = (materialData: any) => {
        const newMaterial: PlannedMaterial = {
            id: db.generateId('MAT'),
            plan_id: currentPlan.id,
            ...materialData,
            total_cost: materialData.quantity * materialData.unit_cost,
        };
        onUpdateMaterials([...materials, newMaterial]);
    };

    const handleAddLabor = (laborData: any) => {
        const newLabor: PlannedLabor = {
            id: db.generateId('LBR'),
            plan_id: currentPlan.id,
            ...laborData,
            total_cost: laborData.quantity * laborData.unit_cost,
        };
        onUpdateLabor([...labor, newLabor]);
    };

    const handleAddIndirect = (indirectData: any) => {
        const newIndirect: PlannedIndirect = {
            id: db.generateId('IND'),
            plan_id: currentPlan.id,
            ...indirectData,
        };
        onUpdateIndirects([...indirects, newIndirect]);
    };

    const handleAddTax = (taxData: any) => {
        const newTax: PlanTax = {
            id: db.generateId('TAX'),
            plan_id: currentPlan.id,
            ...taxData,
        };
        onUpdateTaxes([...taxes, newTax]);
    };

    const generateFullReportHtml = () => {
        const company = db.load('serviflow_company', {
            name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: '12.345.678/0001-90',
        });

        return `
      <div style="width: 100%; font-family: sans-serif; padding: 15mm; background: white;">
        <div style="border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 10mm; display: flex; justify-content: space-between;">
          <div>
            <h1 style="margin: 0; font-size: 16pt;">${company.name}</h1>
            <p style="margin: 2mm 0; font-size: 10pt; color: #666;">PROJETO: ${currentPlan.name}</p>
          </div>
          <div style="text-align: right;">
            <div style="background: #2563eb; color: white; padding: 2mm 4mm; border-radius: 2mm; font-weight: bold; font-size: 10pt;">PLANEJAMENTO</div>
            <p style="margin: 2mm 0; font-size: 12pt; font-weight: bold;">#${currentPlan.id}</p>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 5mm; border-radius: 2mm; margin-bottom: 10mm;">
          <table style="width: 100%; font-size: 10pt;">
            <tr>
              <td style="color: #64748b; font-weight: bold; width: 20%;">CLIENTE:</td>
              <td style="font-weight: bold;">${currentPlan.client_name || 'NÃO INFORMADO'}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: bold;">ENDEREÇO:</td>
              <td style="font-weight: bold;">${currentPlan.address || 'NÃO INFORMADO'}</td>
            </tr>
          </table>
        </div>

        <h3 style="background: #e2e8f0; padding: 2mm; font-size: 11pt; border-radius: 1mm;">RESUMO FINANCEIRO</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10mm;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3mm 0;">MATERIAIS</td>
            <td style="padding: 3mm 0; text-align: right; font-weight: bold;">R$ ${calculations.totalMaterial.toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3mm 0;">MÃO DE OBRA</td>
            <td style="padding: 3mm 0; text-align: right; font-weight: bold;">R$ ${calculations.totalLabor.toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3mm 0;">INDIRETOS</td>
            <td style="padding: 3mm 0; text-align: right; font-weight: bold;">R$ ${calculations.totalIndirect.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5mm 0; font-weight: bold; font-size: 12pt;">CUSTO TOTAL PLANEJADO</td>
            <td style="padding: 5mm 0; text-align: right; font-weight: bold; font-size: 14pt; color: #2563eb;">R$ ${calculations.totalGeneral.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    `;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[80vh] flex flex-col border dark:border-slate-800 overflow-hidden">
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-4">
                        {!embeddedMode && (
                            <button onClick={onBack} className="text-blue-400 hover:text-blue-600 p-1">
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                <HardHat className="text-blue-600 dark:text-blue-400" />
                                {currentPlan.name.toUpperCase()}
                            </h2>
                            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">{currentPlan.status} • GESTÃO DE PLANEJAMENTO</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                notify("Sincronizando com a nuvem...", "info");
                                // Implement cloud sync logic if available, or just a placeholder for now
                            }}
                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-200 transition-all border border-blue-200 dark:border-blue-800"
                        >
                            <ArrowRight className="rotate-180" size={16} /> Sincronizar
                        </button>
                        <button
                            onClick={onSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-900/20"
                        >
                            <Save size={16} /> Salvar
                        </button>
                    </div>
                </div>

                <div className="flex px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'dados', label: 'Dados do Projeto', icon: FileText },
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
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-auto">
                {activeTab === 'dados' && <DataTab plan={currentPlan} customers={customers} onUpdatePlan={onUpdatePlan} />}
                {activeTab === 'servicos' && (
                    <ServicesTab
                        services={services}
                        onAddService={handleAddService}
                        onUpdateService={(up) => onUpdateServices(services.map(s => s.id === up.id ? up : s))}
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
                        onPreviewReport={() => onShowPreview('Planejamento de Obra', generateFullReportHtml(), `${currentPlan.name}.pdf`)}
                        hasGenerateBudget={!!onGenerateBudget}
                    />
                )}
            </div>
        </div>
    );
};
