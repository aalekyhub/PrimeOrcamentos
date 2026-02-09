
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Table, Plus, ChevronRight, Calculator, ExternalLink } from 'lucide-react';
import { sinapiAnalitico, AnaliticoResult } from '../../services/sinapiAnalitico';
import { sinapiDb } from '../../services/sinapiDb';

interface Props {
    onCopyComposition: (result: AnaliticoResult) => void;
}

const SinapiSearchAnalitico: React.FC<Props> = ({ onCopyComposition }) => {
    const [config, setConfig] = useState({ uf: 'DF', mes_ref: '2025/08', modo: 'SE' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [ans, setAns] = useState<AnaliticoResult | null>(null);

    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsSearching(true);
        try {
            const result = await sinapiAnalitico.build(config.mes_ref, config.uf, config.modo, searchTerm);
            setAns(result);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Config Bar */}
            <div className="bg-slate-100 p-2 rounded-2xl flex flex-wrap gap-2 items-center">
                <select
                    className="bg-white border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none"
                    value={config.uf} onChange={e => setConfig({ ...config, uf: e.target.value })}
                >
                    {['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>
                <input
                    type="text" placeholder="MM/AAAA"
                    className="bg-white border-none rounded-xl px-4 py-2 text-[10px] font-black outline-none w-24"
                    value={config.mes_ref} onChange={e => setConfig({ ...config, mes_ref: e.target.value })}
                />
                <select
                    className="bg-white border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none"
                    value={config.modo} onChange={e => setConfig({ ...config, modo: e.target.value })}
                >
                    <option value="SE">SEM ENCARGOS (SE)</option>
                    <option value="SD">SEM DESONERAÇÃO (SD)</option>
                    <option value="CD">COM DESONERAÇÃO (CD)</option>
                </select>

                <div className="flex-1 min-w-[200px] relative">
                    <input
                        type="text" placeholder="Digite o Código da Composição..."
                        className="w-full bg-white border-none rounded-xl pl-4 pr-10 py-2 text-xs font-bold outline-none"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} className="absolute right-2 top-1.5 p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Search className="w-4 h-4" />
                    </button>
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
                    {/* Header Info */}
                    <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                                {ans.composicao?.id ? 'Composição Encontrada' : 'Estrutura BOM Independente'}
                            </div>
                            <button
                                onClick={() => onCopyComposition(ans)}
                                className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-lg"
                            >
                                <Plus className="w-4 h-4" /> Copiar para Catálogo
                            </button>
                        </div>

                        <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">
                            {ans.composicao?.descricao || (ans.itens.length > 0 ? ans.itens[0].descricao_item : 'N/A')}
                        </h3>

                        <div className="flex gap-10">
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Código</p>
                                <p className="text-xl font-black">{searchTerm}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Unidade</p>
                                <p className="text-xl font-black uppercase">{ans.composicao?.unidade || 'UN'}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Custo Total Calc.</p>
                                <p className="text-3xl font-black">R$ {ans.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Table */}
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
                                    <tr key={item.codigo_item} className="hover:bg-slate-50/50 transition-colors">
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
                                        <td className="px-8 py-4 text-right text-[11px] font-black text-slate-900">
                                            R$ {item.custo_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
