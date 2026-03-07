import React, { useState } from 'react';
import { ArrowLeft, Save, LayoutDashboard, FileText, Package, Percent, Building2, Truck, PieChart, HardHat } from 'lucide-react';
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
        <div className="p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 scrollbar-hide">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[80vh] flex flex-col border dark:border-slate-800 overflow-hidden">
                {/* Fixed Editor Header & Tabs */}
                <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                    {/* Editor Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="text-blue-400 hover:text-blue-600 p-1 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                    <LayoutDashboard className="text-blue-600 dark:text-blue-400" />
                                    {currentPlan.name || 'Novo Planejamento'}
                                </h2>
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">PLANEJAMENTO • PREVISTO</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-950/20 active:scale-95 transition-all"
                            >
                                <Save size={16} /> Salvar Alterações
                            </button>
                        </div>
                    </div>

                    {/* Tabs Nav */}
                    <div className="flex px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800">
                        {[
                            { id: 'dados', label: 'Dados Gerais', icon: FileText },
                            { id: 'servicos', label: 'Escope de Serviços', icon: Building2 },
                            { id: 'recursos', label: 'Recursos e Insumos', icon: Truck },
                            { id: 'resumo', label: 'Resumo e Orçamento', icon: PieChart },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
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

                {/* Content Area */}
                <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto">
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
        </div>
    );
};
