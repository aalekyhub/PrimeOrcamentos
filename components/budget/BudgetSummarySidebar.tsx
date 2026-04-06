import React from 'react';
import { Zap, Printer, FileDown, Save, ScrollText } from 'lucide-react';

interface BudgetSummarySidebarProps {
    bdiRate: number | string;
    setBdiRate: (value: number | string) => void;
    taxRate: number | string;
    setTaxRate: (value: number | string) => void;
    subtotal: number;
    totalAmount: number;
    paymentTerms: string;
    setPaymentTerms: (val: string) => void;
    deliveryTime: string;
    setDeliveryTime: (val: string) => void;
    onShowPayment: () => void;
    onPrint: () => void;
    onSave: () => void;
    onGenerateContract: () => void;
    isAdmin?: boolean;
    isEditing?: boolean;
    isSaving?: boolean;
}

const BudgetSummarySidebar: React.FC<BudgetSummarySidebarProps> = ({
    bdiRate, setBdiRate, taxRate, setTaxRate, subtotal, totalAmount,
    paymentTerms, setPaymentTerms, deliveryTime, setDeliveryTime,
    onShowPayment, onPrint, onSave, onGenerateContract,
    isAdmin = true, isEditing = false, isSaving = false
}) => {
    const bdiNum = Number(bdiRate) || 0;
    const taxNum = Number(taxRate) || 0;

    return (
        <div className="w-full lg:w-[340px] bg-[#0f172a] text-white p-6 flex flex-col space-y-6 shrink-0 shadow-2xl relative overflow-hidden h-auto lg:h-full">
            <div className="relative z-10">
                <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Investimento Total</h4>

                {/* Tax & BDI Inputs */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">BDI (%)</label>
                        <input type="number" className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" value={bdiRate} onChange={e => setBdiRate(e.target.value)} placeholder="0%" />
                    </div>
                    <div>
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Impostos (%)</label>
                        <input type="number" className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0%" />
                    </div>
                </div>

                <div className="space-y-1 mb-4 text-[10px] text-slate-400">
                    <div className="flex justify-between"><span>Subtotal:</span> <span className="whitespace-nowrap">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    {bdiNum > 0 && <div className="flex justify-between text-emerald-400"><span>+ BDI:</span> <span className="whitespace-nowrap">R$ {(subtotal * (bdiNum / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    {taxNum > 0 && (
                        <div className="flex justify-between text-blue-400">
                            <span>+ Impostos:</span>
                            <span className="whitespace-nowrap">R$ {(totalAmount - (subtotal + (subtotal * (bdiNum / 100)))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-black border-t border-slate-700 pt-2 mt-2">
                        <span>Total:</span>
                        <span className="whitespace-nowrap">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="flex justify-between items-baseline border-b border-slate-800 pb-4">
                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#60a5fa', letterSpacing: '-0.05em', lineHeight: '1.2', paddingBottom: '4px', whiteSpace: 'nowrap' }}>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {!isAdmin && isEditing && (
                    <div className="mt-4 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest text-center">Modo Somente Leitura</p>
                    </div>
                )}
            </div>

            <div className="space-y-4 relative z-10">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Pagamento</label>
                        {(!isEditing || isAdmin) && (
                            <button onClick={onShowPayment} className="text-[8px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-1 transition-colors">
                                <Zap className="w-3 h-3" /> Gerar
                            </button>
                        )}
                    </div>
                    <textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-[9px] font-bold text-slate-200 outline-none h-20 focus:ring-1 focus:ring-blue-500 leading-relaxed shadow-inner" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} disabled={isEditing && !isAdmin} />
                </div>
                <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Prazo Entrega</label>
                    <input type="text" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-[9px] font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} disabled={isEditing && !isAdmin} />
                </div>
            </div>

            <div className="mt-auto space-y-3 relative z-10">
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={onPrint} className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] flex flex-row items-center justify-center gap-2 transition-all border border-slate-700 group w-full shadow-md shadow-blue-950/20">
                        <Printer className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" /> IMPRIMIR ORÇAMENTO
                    </button>
                    {(!isEditing || isAdmin) && (
                        <button 
                            onClick={onSave} 
                            disabled={isSaving}
                            className={`py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] shadow-md shadow-blue-950/20 transition-all flex items-center justify-center gap-2 w-full ${isSaving ? 'bg-slate-700 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    SALVANDO...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" /> REGISTRAR
                                </>
                            )}
                        </button>
                    )}
                    <button onClick={onGenerateContract} className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] shadow-md shadow-blue-950/20 transition-all flex items-center justify-center gap-2 border border-slate-700">
                        <ScrollText className="w-5 h-5 text-blue-400" /> GERAR CONTRATO
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BudgetSummarySidebar;
