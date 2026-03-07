import React, { useState } from 'react';
import { ArrowLeft, Save, LayoutDashboard, FileText, Package, Percent } from 'lucide-react';
import { PlanningHeader, PlannedService, PlannedMaterial, PlannedLabor, PlannedIndirect, PlanTax, Customer } from '../../types';
import { DataTab } from './tabs/DataTab';
import { ServicesTab } from './tabs/ServicesTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { SummaryTab } from './tabs/SummaryTab';
import ReportPreview from '../ReportPreview';
import { generatePlanningReport } from '../../services/planningPdfService';
import { useNotify } from '../ToastProvider';

interface Props {
    currentPlan: PlanningHeader;
    services: PlannedService[];
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    customers: Customer[];
    calculations: any;
    onBack: () => void;
    onSave: () => void;
    onUpdatePlan: (plan: PlanningHeader) => void;
    onSetServices: (items: PlannedService[]) => void;
    onSetMaterials: (items: PlannedMaterial[]) => void;
    onSetLabor: (items: PlannedLabor[]) => void;
    onSetIndirects: (items: PlannedIndirect[]) => void;
    onSetTaxes: (items: PlanTax[]) => void;
    onDeleteService: (id: string) => void;
    onDeleteMaterial: (id: string) => void;
    onDeleteLabor: (id: string) => void;
    onDeleteIndirect: (id: string) => void;
    onDeleteTax: (id: string) => void;
    onGenerateBudget?: (
        plan: PlanningHeader,
        services: PlannedService[],
        totalMaterial: number,
        totalLabor: number,
        totalIndirect: number,
        bdiRate: number,
        taxRate: number
    ) => void;
}

export const PlanningEditor: React.FC<Props> = ({
    currentPlan,
    services,
    materials,
    labor,
    indirects,
    taxes,
    customers,
    calculations,
    onBack,
    onSave,
    onUpdatePlan,
    onSetServices,
    onSetMaterials,
    onSetLabor,
    onSetIndirects,
    onSetTaxes,
    onDeleteService,
    onDeleteMaterial,
    onDeleteLabor,
    onDeleteIndirect,
    onDeleteTax,
    onGenerateBudget,
}) => {
    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState({ title: '', html: '', filename: '' });
    const { notify } = useNotify();

    const handlePreviewFull = async () => {
        const bdiTx = taxes.find((t) => t.name === 'BDI');
        const bdiRate = bdiTx ? bdiTx.rate : 0;
        const otherTaxes = taxes.filter((t) => t.name !== 'BDI');
        const taxRate = otherTaxes.reduce((acc, t) => acc + (t.rate || 0), 0);

        const company = (window as any).company_data || {};
        const customer = customers.find((c) => c.id === currentPlan.client_id);

        try {
            const html = await generatePlanningReport(
                currentPlan,
                services,
                calculations.totalMaterial,
                calculations.totalLabor,
                calculations.totalIndirect,
                bdiRate,
                taxRate,
                company,
                customer
            );

            setPreviewContent({
                title: `RELATÓRIO DE PLANEJAMENTO - ${currentPlan.name}`,
                html: html,
                filename: `planejamento_${currentPlan.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
            });
            setShowPreview(true);
        } catch (error) {
            notify('Erro ao gerar relatório', 'error');
        }
    };

    const handleGenerateBudget = () => {
        if (!onGenerateBudget) {
            notify('Função não disponível neste modo', 'info');
            return;
        }

        const bdiTx = taxes.find((t) => t.name === 'BDI');
        const bdiRate = bdiTx ? bdiTx.rate : 0;
        const otherTaxes = taxes.filter((t) => t.name !== 'BDI');
        const taxRate = otherTaxes.reduce((acc, t) => acc + (t.rate || 0), 0);

        onGenerateBudget(
            currentPlan,
            services,
            calculations.totalMaterial,
            calculations.totalLabor,
            calculations.totalIndirect,
            bdiRate,
            taxRate
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="bg-blue-600 text-white p-1.5 rounded-lg">
                                <LayoutDashboard size={18} />
                            </span>
                            {currentPlan.name || 'Novo Planejamento'}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentPlan.id}</span>
                            <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-wider">
                                Planejamento
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                    >
                        <Save size={18} /> SALVAR ALTERAÇÕES
                    </button>
                </div>
            </div>

            {/* Tabs Nav */}
            <div className="bg-white dark:bg-slate-900 px-6 shadow-sm shrink-0 overflow-x-auto scrollbar-hide">
                <div className="flex gap-8">
                    {[
                        { id: 'dados', label: 'Dados Gerais', icon: FileText },
                        { id: 'servicos', label: 'Escope de Serviços', icon: LayoutDashboard },
                        { id: 'recursos', label: 'Recursos e Insumos', icon: Package },
                        { id: 'resumo', label: 'Resumo e Orçamento', icon: Percent },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {activeTab === 'dados' && (
                    <DataTab currentPlan={currentPlan} customers={customers} onUpdate={onUpdatePlan} />
                )}
                {activeTab === 'servicos' && (
                    <ServicesTab
                        planId={currentPlan.id}
                        services={services}
                        onSetServices={onSetServices}
                        onDeleteService={onDeleteService}
                    />
                )}
                {activeTab === 'recursos' && (
                    <ResourcesTab
                        planId={currentPlan.id}
                        materials={materials}
                        labor={labor}
                        indirects={indirects}
                        taxes={taxes}
                        totalMaterial={calculations.totalMaterial}
                        totalLabor={calculations.totalLabor}
                        totalIndirect={calculations.totalIndirect}
                        totalDirect={calculations.totalDirect}
                        totalGeneral={calculations.totalGeneral}
                        onSetMaterials={onSetMaterials}
                        onSetLabor={onSetLabor}
                        onSetIndirects={onSetIndirects}
                        onSetTaxes={onSetTaxes}
                        onDeleteMaterial={onDeleteMaterial}
                        onDeleteLabor={onDeleteLabor}
                        onDeleteIndirect={onDeleteIndirect}
                        onDeleteTax={onDeleteTax}
                    />
                )}
                {activeTab === 'resumo' && (
                    <SummaryTab
                        totalMaterial={calculations.totalMaterial}
                        totalLabor={calculations.totalLabor}
                        totalIndirect={calculations.totalIndirect}
                        totalTaxes={calculations.totalTaxes}
                        totalGeneral={calculations.totalGeneral}
                        onPreview={handlePreviewFull}
                        onGenerateBudget={handleGenerateBudget}
                        hasGenerateBudget={!!onGenerateBudget}
                    />
                )}
            </div>

            <ReportPreview
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                title={previewContent.title}
                htmlContent={previewContent.html}
                filename={previewContent.filename}
            />
        </div>
    );
};
