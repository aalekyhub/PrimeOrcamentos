import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNotify } from '../../ToastProvider';

interface AddIndirectFormProps {
    onAdd: (indirect: any) => void;
    planId: string;
}

export const AddIndirectForm: React.FC<AddIndirectFormProps> = ({ onAdd, planId }) => {
    const [category, setCategory] = useState('Transporte');
    const [desc, setDesc] = useState('');
    const [value, setValue] = useState(0);
    const { notify } = useNotify();

    const handleSubmit = () => {
        if (!desc) {
            notify('Descrição obrigatória', 'error');
            return;
        }

        onAdd({
            category,
            description: desc.toUpperCase(),
            value,
        });

        setDesc('');
        setValue(0);
    };

    return (
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                Adicionar Custo Indireto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
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
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                    <input
                        type="text"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
                        placeholder="Ex: Aluguel de betoneira"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor</label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-slate-700 dark:text-slate-100"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-1">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 flex items-center justify-center shadow-md shadow-blue-950/20"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
