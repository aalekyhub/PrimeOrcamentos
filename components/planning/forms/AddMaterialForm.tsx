import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNotify } from '../../ToastProvider';

interface AddMaterialFormProps {
    onAdd: (material: any) => void;
    planId: string;
}

export const AddMaterialForm: React.FC<AddMaterialFormProps> = ({ onAdd, planId }) => {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [qty, setQty] = useState(0);
    const [cost, setCost] = useState(0);
    const { notify } = useNotify();

    const handleSubmit = () => {
        if (!name) {
            notify('Nome do material obrigatório', 'error');
            return;
        }

        onAdd({
            material_name: name.toUpperCase(),
            unit: unit.toUpperCase(),
            quantity: qty,
            unit_cost: cost,
        });

        setName('');
        setUnit('');
        setQty(0);
        setCost(0);
    };

    return (
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                Adicionar Material
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Insumo/Material</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
                        placeholder="Ex: Cimento CP-II"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Qtd</label>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
                        placeholder="0"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Un</label>
                    <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
                        placeholder="un"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Unit.</label>
                    <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 flex items-center justify-center gap-1 shadow-md shadow-blue-950/20"
                    >
                        <Plus size={14} /> ADICIONAR
                    </button>
                </div>
            </div>
        </div>
    );
};
