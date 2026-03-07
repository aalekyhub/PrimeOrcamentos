import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';
import { PlannedService } from '../../../types';

interface Props {
    planId: string;
    onAdd: (service: PlannedService) => void;
}

export const AddServiceForm: React.FC<Props> = ({ planId, onAdd }) => {
    const [desc, setDesc] = useState('');
    const [unit, setUnit] = useState('un');
    const [qty, setQty] = useState('');
    const [price1, setPrice1] = useState('');
    const [price2, setPrice2] = useState('');
    const { notify } = useNotify();

    const handleAdd = () => {
        if (!desc) return notify("Descrição obrigatória", "error");

        const q = parseFloat(qty) || 0;
        const p1 = parseFloat(price1) || 0;
        const p2 = parseFloat(price2) || 0;

        onAdd({
            id: db.generateId('PSVC'),
            plan_id: planId,
            description: desc.toUpperCase(),
            unit: unit.toUpperCase() || 'UN',
            quantity: q,
            unit_material_cost: p1,
            unit_labor_cost: p2,
            total_cost: q * (p1 + p2),
        });

        setDesc('');
        setUnit('un');
        setQty('');
        setPrice1('');
        setPrice2('');
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm rounded-xl mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição do Serviço</label>
                    <input
                        type="text"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="Ex: Pintura de Paredes"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UN</label>
                    <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="un"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd</label>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="0"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Material (Un.)</label>
                    <input
                        type="number"
                        value={price1}
                        onChange={(e) => setPrice1(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">M.O. (Un.)</label>
                    <input
                        type="number"
                        value={price2}
                        onChange={(e) => setPrice2(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        onClick={handleAdd}
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={16} /> ADICIONAR ITEM
                    </button>
                </div>
            </div>
        </div>
    );
};
