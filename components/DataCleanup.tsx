
import React, { useState, useMemo } from 'react';
import { Trash2, Merge, AlertTriangle, CheckCircle, RefreshCw, Layers, Briefcase, Users, Wallet, FileText, Building2 } from 'lucide-react';
import { Customer, CatalogService } from '../types';
import { db } from '../services/db';
import { cleanDocument, formatDocument } from '../services/validation';
import { useNotify } from './ToastProvider';

interface Props {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    services: CatalogService[];
    setServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
}

const DataCleanup: React.FC<Props> = ({ customers, setCustomers, services, setServices }) => {
    const { notify } = useNotify();

    // Encontra duplicados de clientes
    const duplicateCustomers = useMemo(() => {
        const map = new Map<string, Customer[]>();
        customers.forEach(c => {
            const cleanDoc = cleanDocument(c.document);
            if (cleanDoc) {
                if (!map.has(cleanDoc)) map.set(cleanDoc, []);
                map.get(cleanDoc)?.push(c);
            }
        });

        return Array.from(map.values()).filter(group => group.length > 1);
    }, [customers]);

    // Encontra duplicados de serviços
    const duplicateServices = useMemo(() => {
        const map = new Map<string, CatalogService[]>();
        services.forEach(s => {
            const normalizedName = s.name.trim().toLowerCase();
            if (normalizedName) {
                if (!map.has(normalizedName)) map.set(normalizedName, []);
                map.get(normalizedName)?.push(s);
            }
        });

        return Array.from(map.values()).filter(group => group.length > 1);
    }, [services]);

    const mergeCustomers = (group: Customer[]) => {
        if (!confirm(`Deseja mesclar estes ${group.length} registros de cliente? O primeiro registro será mantido e os outros removidos.`)) return;

        const keep = group[0];
        const removeIds = group.slice(1).map(c => c.id);

        setCustomers(prev => prev.filter(c => !removeIds.includes(c.id)));
        removeIds.forEach(id => db.remove('serviflow_customers', id));
        notify(`Clientes mesclados. ${removeIds.length} registros duplicados removidos.`);
    };

    const mergeServices = (group: CatalogService[]) => {
        if (!confirm(`Deseja mesclar estes ${group.length} serviços? O primeiro registro será mantido.`)) return;

        const keep = group[0];
        const removeIds = group.slice(1).map(s => s.id);

        setServices(prev => prev.filter(s => !removeIds.includes(s.id)));
        removeIds.forEach(id => db.remove('serviflow_catalog', id));
        notify(`Serviços mesclados. ${removeIds.length} registros duplicados removidos.`);
    };

    const tableStats = useMemo(() => {
        const categories = [
            {
                title: 'Planejamento',
                color: 'blue',
                tables: [
                    { id: 'serviflow_plans', label: 'Projetos', icon: Layers },
                    { id: 'serviflow_plan_services', label: 'Serviços', icon: Briefcase },
                    { id: 'serviflow_plan_materials', label: 'Materiais', icon: Layers },
                    { id: 'serviflow_plan_labor', label: 'Mão de Obra', icon: Users },
                    { id: 'serviflow_plan_indirects', label: 'Custos Indiretos', icon: Wallet },
                    { id: 'serviflow_plan_taxes', label: 'Impostos', icon: FileText },
                ]
            },
            {
                title: 'Execução (Obras)',
                color: 'emerald',
                tables: [
                    { id: 'serviflow_works', label: 'Obras', icon: Building2 },
                    { id: 'serviflow_work_services', label: 'Serviços', icon: Briefcase },
                    { id: 'serviflow_work_materials', label: 'Materiais', icon: Layers },
                    { id: 'serviflow_work_labor', label: 'Mão de Obra', icon: Users },
                    { id: 'serviflow_work_indirects', label: 'Custos Indiretos', icon: Wallet },
                    { id: 'serviflow_work_taxes', label: 'Impostos', icon: FileText },
                ]
            }
        ];

        return categories.map(cat => ({
            ...cat,
            tables: cat.tables.map(t => ({
                ...t,
                count: (db.load(t.id, []) as any[]).length
            }))
        }));
    }, []);

    const hasDuplicates = duplicateCustomers.length > 0 || duplicateServices.length > 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Auditoria de Dados</h2>
                    <p className="text-slate-500 text-sm">Resumo da saúde e integridade do seu banco de dados local.</p>
                </div>
                {!hasDuplicates && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest border border-emerald-100">
                        <CheckCircle className="w-4 h-4" /> Banco de dados íntegro
                    </div>
                )}
            </div>

            {/* Sumário de Tabelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tableStats.map((cat, idx) => (
                    <div key={idx} className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm`}>
                        <h3 className={`text-xs font-black text-${cat.color}-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2`}>
                            <Layers className="w-4 h-4" /> {cat.title}
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {cat.tables.map((t, tidx) => (
                                <div key={tidx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-blue-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <t.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate">{t.label}</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tighter">
                                        {t.count || 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Caçador de Dados Fantasmas */}
            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm">
                        <Trash2 className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black text-amber-900 tracking-tight">Caçador de Dados Fantasmas</h3>
                        <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                            Se um projeto (como <b>PLAN-5131</b>) insiste em reaparecer mesmo após ser excluído, digite o ID abaixo para uma limpeza profunda na nuvem e no computador.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Ex: PLAN-5131"
                                id="ghost-id-input"
                                className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <button
                                onClick={async () => {
                                    const input = document.getElementById('ghost-id-input') as HTMLInputElement;
                                    const id = input?.value.trim().toUpperCase();

                                    if (!id || !id.startsWith('PLAN-')) {
                                        notify("Digite um ID válido (Ex: PLAN-1234)", "error");
                                        return;
                                    }

                                    if (!confirm(`Deseja realizar uma limpeza profunda do projeto ${id}? Isso removerá o projeto e todos os seus itens da nuvem permanentemente.`)) return;

                                    try {
                                        notify(`Iniciando limpeza profunda de ${id}...`);

                                        // Deletar em cascata manual (mesma lógica que o Unified)
                                        const tables = [
                                            'serviflow_plan_services', 'serviflow_plan_materials',
                                            'serviflow_plan_labor', 'serviflow_plan_indirects',
                                            'serviflow_plan_taxes', 'serviflow_plans'
                                        ];

                                        for (const table of tables) {
                                            await (db as any).deleteByCondition(table, table === 'serviflow_plans' ? 'id' : 'plan_id', id);
                                        }

                                        notify(`Projeto ${id} e itens removidos com sucesso!`, "success");
                                        input.value = '';
                                        setTimeout(() => window.location.reload(), 1500);
                                    } catch (e: any) {
                                        notify("Erro na limpeza profunda: " + e.message, "error");
                                    }
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Limpeza Profunda
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Diagnóstico de Emergência */}
            <div className="pt-12 mt-8 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Sincronização de Emergência</h3>
                        <p className="text-slate-500 text-sm">Use estas ferramentas apenas em caso de divergência entre dispositivos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Botão de Envio Forçado - SEGURO */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:border-blue-200 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 rounded-2xl">
                                <RefreshCw className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900">Forçar Envio para Nuvem</h4>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    Pega todos os dados **deste dispositivo** e envia para a conta online (Supabase).
                                    **NÃO APAGA NADA.** É ideal para enviar dados do Celular para o Computador.
                                </p>
                                <button
                                    onClick={async () => {
                                        if (!confirm("Deseja forçar o envio de todos os dados locais para a nuvem? Isso garantirá que sua conta online tenha a versão mais recente deste dispositivo.")) return;

                                        try {
                                            notify("Iniciando upload forçado...");
                                            const result = await db.forceUploadAll();
                                            if (result.success) {
                                                notify(`Upload concluído! ${result.count} registros sincronizados.`);
                                            } else {
                                                notify("Erro no upload: " + result.error, "error");
                                            }
                                        } catch (e) {
                                            notify("Erro crítico ao sincronizar.", "error");
                                        }
                                    }}
                                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
                                >
                                    Enviar dados para Nuvem
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Botão de Recebimento - SEGURO (Apenas recarrega) */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:border-emerald-200 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <RefreshCw className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900">Baixar dados da Nuvem</h4>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    Força o sistema a buscar as atualizações mais recentes da sua conta online.
                                    **NÃO APAGA SEUS DADOS LOCAIS.**
                                </p>
                                <button
                                    onClick={async () => {
                                        notify("Buscando atualizações...");
                                        const result = await db.syncFromCloud();
                                        if (result && !result.errors.global) {
                                            notify("Sincronização concluída com sucesso!");
                                            setTimeout(() => window.location.reload(), 1000);
                                        } else {
                                            notify("Erro ao baixar dados.", "error");
                                        }
                                    }}
                                    className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
                                >
                                    Baixar da Nuvem
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataCleanup;
