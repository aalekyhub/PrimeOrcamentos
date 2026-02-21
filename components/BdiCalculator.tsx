
import React, { useState, useEffect } from 'react';
import { Calculator, Percent, Info, Save } from 'lucide-react';
import { BdiConfig } from '../types';
import { calculateBDI } from '../services/sinapiUtils';
import { useNotify } from './ToastProvider';

interface Props {
    initialConfig?: BdiConfig;
    onSave: (config: BdiConfig) => void;
}

const BdiCalculator: React.FC<Props> = ({ initialConfig, onSave }) => {
    const [config, setConfig] = useState<Omit<BdiConfig, 'id' | 'total'>>(initialConfig || {
        name: 'BDI Padrãonizado',
        ac: 4.00,
        s: 0.80,
        g: 0.20,
        r: 0.97,
        df: 0.59,
        l: 7.40,
        iss: 5.00,
        pis: 0.65,
        cofins: 3.00,
        cprb: 4.50
    });

    const [totalBdi, setTotalBdi] = useState(0);
    const { notify } = useNotify();

    useEffect(() => {
        setTotalBdi(calculateBDI(config));
    }, [config]);

    const handleChange = (field: keyof typeof config, value: string | number) => {
        setConfig(prev => ({
            ...prev,
            [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
        }));
    };

    return (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
            <div className="bg-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Calculator className="w-6 h-6" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Calculadora de BDI</h3>
                </div>
                <p className="text-indigo-100 text-xs font-medium opacity-80">
                    Baseado na fórmula padrão do TCU e SINAPI para obras civis.
                </p>
            </div>

            <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Custos Indiretos */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Custos Indiretos & Riscos</h4>

                        <div className="space-y-3">
                            <BdiInput label="Adm. Central (AC)" value={config.ac} onChange={v => handleChange('ac', v)} />
                            <BdiInput label="Seguro (S)" value={config.s} onChange={v => handleChange('s', v)} />
                            <BdiInput label="Garantia (G)" value={config.g} onChange={v => handleChange('g', v)} />
                            <BdiInput label="Riscos (R)" value={config.r} onChange={v => handleChange('r', v)} />
                            <BdiInput label="Desp. Financeiras (DF)" value={config.df} onChange={v => handleChange('df', v)} />
                            <BdiInput label="Lucro (L)" value={config.l} onChange={v => handleChange('l', v)} />
                        </div>
                    </div>

                    {/* Tributos */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Tributos (I)</h4>

                        <div className="space-y-3">
                            <BdiInput label="ISS" value={config.iss} onChange={v => handleChange('iss', v)} />
                            <BdiInput label="PIS" value={config.pis} onChange={v => handleChange('pis', v)} />
                            <BdiInput label="COFINS" value={config.cofins} onChange={v => handleChange('cofins', v)} />
                            <BdiInput label="CPRB" value={config.cprb} onChange={v => handleChange('cprb', v)} />
                        </div>

                        <div className="mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    O CPRB (Contribuição Previdenciária sobre a Receita Bruta) deve ser incluído apenas em casos de desoneração da folha.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Final</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-indigo-600 tracking-tighter">BDI = {totalBdi.toFixed(2)}%</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            onSave({ ...config, id: initialConfig?.id || 'default', total: totalBdi } as BdiConfig);
                            notify('Configuração de BDI calculada!');
                        }}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Aplicar BDI
                    </button>
                </div>
            </div>
        </div>
    );
};

interface InputProps {
    label: string;
    value: number;
    onChange: (val: string) => void;
}

const BdiInput: React.FC<InputProps> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between gap-4">
        <label className="text-xs font-bold text-slate-600">{label}</label>
        <div className="relative w-24">
            <input
                type="number"
                step="0.01"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
            <span className="absolute right-3 top-1.5 text-[10px] font-bold text-slate-400">%</span>
        </div>
    </div>
);

export default BdiCalculator;
