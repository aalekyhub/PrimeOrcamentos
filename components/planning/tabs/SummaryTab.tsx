import React from 'react';
import { PieChart, Truck, HardHat, Archive, Percent, Eye, Calculator } from 'lucide-react';

interface SummaryTabProps {
    calculations: any;
    onGenerateBudget: () => void;
    onPreviewReport: () => void;
    hasGenerateBudget: boolean;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
    calculations,
    onGenerateBudget,
    onPreviewReport,
    hasGenerateBudget,
}) => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Materiais', value: calculations.totalMaterial, icon: Truck, color: 'emerald' },
                    { label: 'Mão de Obra', value: calculations.totalLabor, icon: HardHat, color: 'amber' },
                    { label: 'Indiretos', value: calculations.totalIndirect, icon: Archive, color: 'slate' },
                    { label: 'Impostos', value: calculations.totalTaxes, icon: Percent, color: 'blue' },
                ].map((item) => (
                    <div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 p-6 rounded-xl border border-${item.color}-200 shadow-sm`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold text-${item.color}-600 uppercase tracking-wider`}>{item.label}</span>
                            <item.icon size={16} className={`text-${item.color}-600`} />
                        </div>
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">R$ {item.value.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={onPreviewReport}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-all shadow-md group border-b-4 border-b-blue-600 active:border-b-0 active:translate-y-1"
                >
                    <div className="bg-blue-100 p-2 rounded-xl group-hover:scale-110 transition-transform">
                        <Eye size={24} className="text-blue-600" />
                    </div>
                    <div className="text-left">
                        <span className="block text-slate-800 font-bold">Relatório Executivo</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Visualizar PDF</span>
                    </div>
                </button>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-xl gap-6">
                <div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Custo Total Planejado</p>
                    <p className="text-4xl font-bold italic">R$ {calculations.totalGeneral.toFixed(2)}</p>
                </div>
                <button
                    onClick={onGenerateBudget}
                    disabled={!hasGenerateBudget}
                    className={`bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black shadow-lg flex items-center gap-3 transition-all transform hover:scale-105 ${!hasGenerateBudget ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Calculator size={24} /> GERAR ORÇAMENTO
                </button>
            </div>
        </div>
    );
};
