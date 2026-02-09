
import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Trash2, Database, Loader2 } from 'lucide-react';
import { sinapiParser } from '../services/sinapiParser';
import { sinapiDb, SinapiInsumoRecord, SinapiComposicaoRecord } from '../services/sinapiDb';
import { useNotify } from './ToastProvider';

const SinapiImporter: React.FC = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<{ insumosCount: number; composicoesCount: number; datasets: string[] }>({
        insumosCount: 0,
        composicoesCount: 0,
        datasets: []
    });
    const { notify } = useNotify();

    useEffect(() => {
        loadMetadata();
    }, []);

    const loadMetadata = async () => {
        const meta = await sinapiDb.getMetadata();
        setMetadata(meta);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const processFile = async (file: File) => {
        setIsProcessing(true);
        try {
            const result = await sinapiParser.parseFile(file);

            if (result.type === 'INSUMO') {
                await sinapiDb.saveInsumos(result.data as SinapiInsumoRecord[]);
            } else {
                await sinapiDb.saveComposicoes(result.data as SinapiComposicaoRecord[]);
            }

            notify(`Sucesso: ${result.data.length} ${result.type === 'INSUMO' ? 'insumos' : 'composições'} importados!`);
            await loadMetadata();
        } catch (err) {
            console.error(err);
            notify('Falha ao processar o arquivo SINAPI. Verifique se o formato é compatível.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = async () => {
        if (confirm('Deseja limpar todos os dados locais do SINAPI?')) {
            await sinapiDb.clearData();
            await loadMetadata();
            notify('Dados do SINAPI removidos do armazenamento local.');
        }
    };

    return (
        <div className="space-y-6">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) processFile(file);
                }}
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center py-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                        <h4 className="text-lg font-bold text-slate-900">Processando Planilha...</h4>
                        <p className="text-slate-500 text-sm">Validando dados e salvando localmente.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Upload className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Importar Base SINAPI</h4>
                        <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
                            Selecione os arquivos originais (.xlsx) de <b>Insumos</b> ou <b>Composições</b> baixados da CAIXA.
                        </p>
                        <label className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer hover:bg-indigo-700 transition-all inline-block shadow-lg shadow-indigo-100">
                            Escolher Arquivo
                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </>
                )}
            </div>

            {(metadata.insumosCount > 0 || metadata.composicoesCount > 0) && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-indigo-600" />
                            <h5 className="font-black text-slate-900 uppercase tracking-tighter">Status do Armazenamento Local</h5>
                        </div>
                        <button onClick={handleClear} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all" title="Limpar Tudo">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Insumos</p>
                            <p className="text-2xl font-black text-slate-900">{metadata.insumosCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Composições</p>
                            <p className="text-2xl font-black text-slate-900">{metadata.composicoesCount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Datasets Ativos:</p>
                        <div className="flex flex-wrap gap-2">
                            {metadata.datasets.map(d => (
                                <span key={d} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-indigo-100">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    <p className="font-black uppercase tracking-widest mb-1">Aviso de Privacidade</p>
                    Estes dados são armazenados localmente no seu navegador (IndexedDB) e NÃO são enviados para a nuvem. Isso garante performance e privacidade.
                </div>
            </div>
        </div>
    );
};

export default SinapiImporter;
