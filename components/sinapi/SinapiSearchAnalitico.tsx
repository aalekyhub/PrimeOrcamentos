
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Plus, Calculator, Pencil, X } from 'lucide-react';
import { sinapiAnalitico, AnaliticoResult } from '../../services/sinapiAnalitico';
import { sinapiDb } from '../../services/sinapiDb';
import { useNotify } from '../ToastProvider';
import BdiCalculator from '../BdiCalculator';

interface Props {
    onCopyComposition: (result: AnaliticoResult) => void;
}

const SinapiSearchAnalitico: React.FC<Props> = ({ onCopyComposition }) => {
    const [config, setConfig] = useState({ uf: 'DF', mes_ref: '2025/08', modo: 'SE' });
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [ans, setAns] = useState<AnaliticoResult | null>(null);
    const [bdiRate, setBdiRate] = useState<number>(0);
    const [showBdiModal, setShowBdiModal] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const { notify } = useNotify();
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length > 2) {
                const results = await sinapiDb.searchComposicoes(searchTerm, config);
                setSuggestions(results);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, config]);

    const handleSearch = async (forcedCode?: string) => {
        const code = forcedCode || searchTerm;
        if (!code) return;
        setIsSearching(true);
        setShowSuggestions(false);
        setEditingItemId(null);
        try {
            const result = await sinapiAnalitico.build(config.mes_ref, config.uf, config.modo, code);

            // Auto-heal: If the master price stored for search differs from the analytical calculation, sync it.
            if (result.composicao && Math.abs(result.composicao.custo_unitario - result.total) > 0.01) {
                const masterCompId = `${config.mes_ref}_${config.uf}_${config.modo}_COMP_${result.composicao.codigo}`;
                await sinapiDb.updateComposicaoPrice(masterCompId, result.total);
                // Also update the local state record so it stays correct
                result.composicao.custo_unitario = result.total;
            }

            setAns(result);
            if (forcedCode) setSearchTerm(forcedCode);
        } finally {
            setIsSearching(false);
        }
    };

    const handleUpdatePrice = async (item: any) => {
        const newPrice = parseFloat(editValue.replace(',', '.'));
        if (isNaN(newPrice)) return;

        try {
            if (item.tipo_item === 'INSUMO') {
                const id = `${config.mes_ref}_${config.uf}_${config.modo}_INS_${item.codigo_item}`;
                await sinapiDb.updateInsumoPrice(id, newPrice);
            } else if (item.tipo_item === 'COMPOSICAO') {
                const id = `${config.mes_ref}_${config.uf}_${config.modo}_COMP_${item.codigo_item}`;
                await sinapiDb.updateComposicaoPrice(id, newPrice);
            }

            const compCode = ans?.composicao?.codigo || searchTerm;
            const anaId = `${config.mes_ref}_${config.uf}_${config.modo}_ANA_${compCode}_${item.tipo_item}_${item.codigo_item}`;
            await sinapiDb.updateComposicaoItemPrice(anaId, newPrice);

            if (ans) {
                const newItens = ans.itens.map(it => {
                    if (it.codigo_item === item.codigo_item) {
                        return { ...it, custo_unitario: newPrice, custo_total: it.coeficiente * newPrice };
                    }
                    return it;
                });
                const newTotal = Math.round(newItens.reduce((acc, it) => acc + (it.custo_total || 0), 0) * 100) / 100;

                // CRITICAL: Update the parent composition record so search results match the new calculated total
                const masterCompId = `${config.mes_ref}_${config.uf}_${config.modo}_COMP_${ans.composicao?.codigo || searchTerm}`;
                await sinapiDb.updateComposicaoPrice(masterCompId, newTotal);

                setAns({ ...ans, itens: newItens, total: newTotal });
            }

            setEditingItemId(null);
            notify('Preço atualizado com sucesso!');
        } catch (err) {
            console.error(err);
            notify('Erro ao atualizar preço.', 'error');
        }
    };

    const handleCopy = () => {
        if (!ans) return;
        const finalPrice = bdiRate > 0 ? ans.total * (1 + bdiRate / 100) : ans.total;
        onCopyComposition({ ...ans, total: finalPrice });
    };

    return (
        <div className="space-y-6">
            <div ref={containerRef} className="bg-slate-100 p-2 rounded-2xl flex flex-wrap gap-2 items-center">
                <select
                    className="bg-white dark:bg-slate-700 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none text-slate-900 dark:text-white"
                    value={config.uf} onChange={e => setConfig({ ...config, uf: e.target.value })}
                >
                    {['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>
                <input
                    type="text" placeholder="MM/AAAA"
                    className="bg-white dark:bg-slate-700 border-none rounded-xl px-4 py-2 text-[10px] font-black outline-none w-24 text-slate-900 dark:text-white"
                    value={config.mes_ref} onChange={e => setConfig({ ...config, mes_ref: e.target.value })}
                />
                <select
                    className="bg-white dark:bg-slate-700 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none text-slate-900 dark:text-white"
                    value={config.modo} onChange={e => setConfig({ ...config, modo: e.target.value })}
                >
                    <option value="SE">SEM ENCARGOS (SE)</option>
                    <option value="SD">SEM DESONERAÇÃO (SD)</option>
                    <option value="CD">COM DESONERAÇÃO (CD)</option>
                </select>

                <div className="flex-1 min-w-[200px] relative">
                    <input
                        type="text" placeholder="Digite o Código ou Nome da Composição..."
                        className="w-full bg-white dark:bg-slate-700 border-none rounded-xl pl-4 pr-10 py-2 text-xs font-bold outline-none text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSearch();
                            if (e.key === 'Escape') setShowSuggestions(false);
                        }}
                    />
                    <button onClick={() => handleSearch()} className="absolute right-2 top-1.5 p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Search className="w-4 h-4" />
                    </button>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 max-h-[400px] overflow-y-auto anima-in fade-in slide-in-from-top-2 duration-200">
                            {suggestions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSearch(s.codigo)}
                                    className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700 last:border-none group transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{s.codigo}</p>
                                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{s.descricao}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white">R$ {s.custo_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isSearching && (
                <div className="py-20 text-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Buscando Estrutura e Preços...</p>
                </div>
            )}

            {ans && (
                <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-900/20">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                                Composição Encontrada
                            </div>
                            <button
                                onClick={handleCopy}
                                className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-md shadow-black/5"
                            >
                                <Plus className="w-4 h-4" /> Copiar para Catálogo
                            </button>
                        </div>

                        <h3 className="text-2xl font-black tracking-tighter uppercase mb-6">
                            {ans.composicao?.descricao || (ans.itens.length > 0 ? ans.itens[0].descricao_item : 'N/A')}
                        </h3>

                        <div className="flex flex-wrap gap-10">
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Código</p>
                                <p className="text-xl font-black">{ans.composicao?.codigo || searchTerm}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Unidade</p>
                                <p className="text-xl font-black uppercase">{ans.composicao?.unidade || 'UN'}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Custo Total Calc.</p>
                                <p className={`text-3xl font-black ${bdiRate > 0 ? 'text-indigo-200 line-through decoration-white/30 text-xl' : ''}`}>R$ {ans.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>

                            {bdiRate > 0 && (
                                <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/20 animate-in zoom-in duration-300">
                                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                        Venda com BDI ({bdiRate.toFixed(2)}%)
                                        <button onClick={() => setBdiRate(0)} className="hover:text-white transition-colors" title="Remover BDI">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </p>
                                    <p className="text-3xl font-black">R$ {(ans.total * (1 + bdiRate / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            )}

                            <div className="flex items-center">
                                <button
                                    onClick={() => setShowBdiModal(true)}
                                    className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-indigo-400/30 shadow-lg"
                                >
                                    <Calculator className="w-4 h-4" /> {bdiRate > 0 ? 'Alterar BDI' : 'Aplicar BDI'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-10">Tipo</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item / Descrição</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Und</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Coef.</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Unitário</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {ans.itens.map(item => (
                                    <tr key={item.codigo_item} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-4 pl-10">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${item.tipo_item === 'INSUMO' ? 'bg-blue-50 text-blue-600' :
                                                item.tipo_item === 'COMPOSICAO' ? 'bg-purple-50 text-purple-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                {item.tipo_item}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-[10px] font-bold text-slate-500">{item.codigo_item}</td>
                                        <td className="px-8 py-4 text-[11px] font-bold text-slate-900 leading-tight max-w-xs">{item.descricao_item}</td>
                                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 text-center uppercase">{item.unidade_item}</td>
                                        <td className="px-8 py-4 text-right text-[11px] font-bold text-slate-600">{item.coeficiente.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</td>
                                        <td className="px-8 py-4 text-right text-[11px] font-black group-hover:bg-indigo-50/50 transition-all cursor-pointer min-w-[120px]"
                                            onClick={() => {
                                                setEditingItemId(item.codigo_item);
                                                setEditValue(item.custo_unitario.toFixed(2));
                                            }}
                                        >
                                            {editingItemId === item.codigo_item ? (
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-right text-[11px] font-black text-indigo-600 outline-none"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleUpdatePrice(item);
                                                        if (e.key === 'Escape') setEditingItemId(null);
                                                    }}
                                                    onBlur={() => {
                                                        const cleaned = editValue.trim();
                                                        if (cleaned && cleaned !== item.custo_unitario.toFixed(2)) {
                                                            handleUpdatePrice(item);
                                                        } else {
                                                            setEditingItemId(null);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-end gap-1 group/price">
                                                    <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                                                    <span className="text-slate-900">R$ {item.custo_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-4 text-right pr-10 text-[11px] font-black text-indigo-600">
                                            R$ {item.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showBdiModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300 relative">
                        <button
                            onClick={() => setShowBdiModal(false)}
                            className="absolute -top-4 -right-4 bg-white text-slate-400 hover:text-slate-600 p-2 rounded-full shadow-xl z-10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <BdiCalculator
                            onSave={(config) => {
                                setBdiRate(config.total);
                                setShowBdiModal(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {!ans && !isSearching && (
                <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                    <Calculator className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h5 className="text-slate-400 font-black uppercase text-xs tracking-widest">Consulta Analítica SINAPI</h5>
                    <p className="text-slate-300 text-[10px] mt-2 max-w-xs mx-auto">
                        Digite o código de uma composição para ver sua estrutura completa de insumos e coeficientes.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SinapiSearchAnalitico;
