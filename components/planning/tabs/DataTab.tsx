import React from 'react';
import { PlanningHeader, Customer } from '../types';

interface DataTabProps {
    plan: PlanningHeader;
    customers: Customer[];
    onUpdatePlan: (plan: PlanningHeader) => void;
}

export const DataTab: React.FC<DataTabProps> = ({ plan, customers, onUpdatePlan }) => {
    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Identificador da Obra</label>
                    <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => onUpdatePlan({ ...plan, name: e.target.value.toUpperCase() })}
                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/10 outline-none shadow-sm transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status de Execução</label>
                    <select
                        value={plan.status}
                        onChange={(e) => onUpdatePlan({ ...plan, status: e.target.value as any })}
                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="Planejamento">Planejamento</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cliente Vinculado</label>
                <select
                    value={plan.client_id}
                    onChange={(e) => onUpdatePlan({ ...plan, client_id: e.target.value, client_name: customers.find(c => c.id === e.target.value)?.name })}
                    className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">Selecione um cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço da Obra</label>
                <input
                    type="text"
                    value={plan.address}
                    onChange={(e) => onUpdatePlan({ ...plan, address: e.target.value })}
                    className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Rua, Número, Bairro, Cidade..."
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                    <select
                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/20"
                        value={plan.type}
                        onChange={(e) => onUpdatePlan({ ...plan, type: e.target.value })}
                    >
                        <option>Reforma</option>
                        <option>Construção Nova</option>
                        <option>Manutenção</option>
                        <option>Outros</option>
                    </select>
                </div>
            </div>

            <div className="space-y-3 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <label className="block text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Imagem de Anexo (Opcional)</label>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Aparecerá no final do relatório PDF em uma nova página</p>
                    </div>
                    {plan.annex_image && (
                        <button
                            onClick={() => onUpdatePlan({ ...plan, annex_image: undefined })}
                            className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest"
                        >
                            Remover
                        </button>
                    )}
                </div>

                {!plan.annex_image ? (
                    <div className="relative group">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        onUpdatePlan({ ...plan, annex_image: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-all bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Clique para selecionar imagem <br /> ou arraste o arquivo aqui</span>
                        </div>
                    </div>
                ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-900 max-h-[250px] flex justify-center items-center">
                        <img src={plan.annex_image} className="max-w-full max-h-[250px] object-contain" alt="Anexo" />
                    </div>
                )}
            </div>

            <div className="p-6 bg-blue-50/50 dark:bg-slate-800/50 rounded-3xl border border-blue-100 dark:border-slate-700/50">
                <p className="text-[10px] font-bold text-blue-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                    Nota: Os dados preenchidos aqui são utilizados nos cabeçalhos de todos os relatórios e documentos gerados para esta obra.
                </p>
            </div>
        </div>
    );
};
