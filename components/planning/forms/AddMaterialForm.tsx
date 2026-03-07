import React, { useState } from 'react';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';
import { PlannedMaterial } from '../../../types';

interface Props {
    planId: string;
    onAdd: (material: PlannedMaterial) => void;
}

export const AddMaterialForm: React.FC<Props> = ({ planId, onAdd }) => {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('un');
    const [qty, setQty] = useState('');
    const [cost, setCost] = useState('');
    const { notify } = useNotify();

    const handleAdd = () => {
        if (!name) return notify("Material obrigatório", "error");

        const q = parseFloat(qty) || 0;
        const c = parseFloat(cost) || 0;

        onAdd({
            id: db.generateId('PMAT'),
            plan_id: planId,
            material_name: name.toUpperCase(),
            unit: unit.toUpperCase() || 'UN',
            quantity: q,
            unit_cost: c,
            total_cost: q * c,
        });

        setName('');
        setUnit('un');
        setQty('');
        setCost('');
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição do Material</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Ex: Cimento CP-II 50kg"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UN</label>
                    <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="un"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd</label>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="0"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                    <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        onClick={handleAdd}
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm"
                    >
                        ADICIONAR MATERIAL
                    </button>
                </div>
            </div>
        </div>
    );
};
