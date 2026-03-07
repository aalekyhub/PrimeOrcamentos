import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';
import { PlannedIndirect } from '../../../types';

interface Props {
    planId: string;
    onAdd: (indirect: PlannedIndirect) => void;
}

export const AddIndirectForm: React.FC<Props> = ({ planId, onAdd }) => {
    const [cat, setCat] = useState('Transporte');
    const [desc, setDesc] = useState('');
    const [val, setVal] = useState('');
    const { notify } = useNotify();

    const handleAdd = () => {
        if (!desc) return notify("Descrição obrigatória", "error");

        const v = parseFloat(val) || 0;

        onAdd({
            id: db.generateId('IND'),
            plan_id: planId,
            category: cat,
            description: desc.toUpperCase(),
            value: v,
        });

        setDesc('');
        setVal('');
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                    <select
                        value={cat}
                        onChange={(e) => setCat(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 outline-none"
                    >
                        <option>Transporte</option>
                        <option>Alimentação</option>
                        <option>EPI</option>
                        <option>Equipamentos</option>
                        <option>Taxas</option>
                        <option>Outros</option>
                    </select>
                </div>
                <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                    <input
                        type="text"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="Ex: Combustível ida/volta"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor</label>
                    <input
                        type="number"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-1">
                    <button
                        onClick={handleAdd}
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm flex items-center justify-center"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
