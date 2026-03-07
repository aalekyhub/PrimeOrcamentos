import React, { useState } from 'react';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';
import { PlannedLabor } from '../../../types';

interface Props {
    planId: string;
    onAdd: (labor: PlannedLabor) => void;
}

export const AddLaborForm: React.FC<Props> = ({ planId, onAdd }) => {
    const [role, setRole] = useState('');
    const [type, setType] = useState('Diária');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('un');
    const [cost, setCost] = useState('');
    const { notify } = useNotify();

    const handleAdd = () => {
        if (!role) return notify("Função obrigatória", "error");

        const q = parseFloat(qty) || 0;
        const c = parseFloat(cost) || 0;

        onAdd({
            id: db.generateId('LBR'),
            plan_id: planId,
            role: role.toUpperCase(),
            cost_type: type as any,
            unit: unit,
            quantity: q,
            unit_cost: c,
            charges_percent: 0,
            total_cost: q * c,
        });

        setRole('');
        setQty('');
        setUnit('un');
        setCost('');
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Função</label>
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="Ex: Pedreiro"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 outline-none"
                    >
                        <option value="Diária">Diária</option>
                        <option value="Hora">Hora</option>
                        <option value="Empreitada">Empreitada</option>
                    </select>
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
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                    <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        onClick={handleAdd}
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm"
                    >
                        ADICIONAR M.O.
                    </button>
                </div>
            </div>
        </div>
    );
};
