
import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, Database, Trash2 } from 'lucide-react';
import { sinapiParsers } from '../../services/sinapiParsers';
import { sinapiDb } from '../../services/sinapiDb';
import { useNotify } from '../ToastProvider';

const SinapiImporterInsumos: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [config, setConfig] = useState({ uf: 'DF', mes_ref: '2025/08', modo: 'SE' });
    const [count, setCount] = useState<number | null>(null);
    const { notify } = useNotify();

    const refreshCount = React.useCallback(async () => {
        try {
            const val = await sinapiDb.getStoreStats('sinapi_insumos', config.mes_ref, config.uf, config.modo);
            setCount(val);
        } catch (err) {
            console.error('Error fetching count:', err);
        }
    }, [config]);

    React.useEffect(() => {
        refreshCount();
    }, [refreshCount]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const records = await sinapiParsers.parseInsumos({ file, ...config });
            await sinapiDb.clearDataset('sinapi_insumos', config.mes_ref, config.uf, config.modo);
            await sinapiDb.saveBatch('sinapi_insumos', records);
            notify(`Sucesso: ${records.length} insumos importados para ${config.uf} (${config.mes_ref})`);
            refreshCount();
        } catch (err: any) {
            notify(err.message || 'Erro ao importar insumos', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = async () => {
        if (!confirm(`Deseja limpar os dados de INSUMOS de ${config.uf} (${config.mes_ref})?`)) return;
        setIsProcessing(true);
        try {
            await sinapiDb.clearDataset('sinapi_insumos', config.mes_ref, config.uf, config.modo);
            notify(`Dados de insumos limpos para ${config.uf} (${config.mes_ref})`);
            refreshCount();
        } catch (err: any) {
            notify('Erro ao limpar dados', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-black text-slate-900 uppercase tracking-tighter">Importar Insumos (Preços)</h4>
                </div>
                {count !== null && count > 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[10px] font-black">{count.toLocaleString()} DISPONÍVEIS</span>
                    </div>
                )}
                {count === 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-50 text-slate-400 px-2 py-1 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest">Vazio</span>
                    </div>
                )}
                <button
                    onClick={handleClear}
                    disabled={isProcessing}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Limpar este conjunto de dados"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <select
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    value={config.uf} onChange={e => setConfig({ ...config, uf: e.target.value })}
                >
                    {['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>
                <input
                    type="text" placeholder="MM/AAAA"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    value={config.mes_ref} onChange={e => setConfig({ ...config, mes_ref: e.target.value })}
                />
                <select
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    value={config.modo} onChange={e => setConfig({ ...config, modo: e.target.value })}
                >
                    <option value="SE">SEM ENCARGOS (SE)</option>
                    <option value="SD">SEM DESONERAÇÃO (SD)</option>
                    <option value="CD">COM DESONERAÇÃO (CD)</option>
                </select>
            </div>

            <label className="block border-2 border-dashed border-slate-100 rounded-xl p-6 text-center hover:bg-slate-50 transition-all cursor-pointer">
                {isProcessing ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Processando...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Upload className="w-6 h-6 text-slate-300 mb-2" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Clique para subir XLSX ou CSV de Insumos</span>
                    </div>
                )}
                <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} disabled={isProcessing} />
            </label>
        </div>
    );
};

export default SinapiImporterInsumos;
