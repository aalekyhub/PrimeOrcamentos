import React, { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { PlannedIndirect } from '../../../types';

interface Props {
    indirect: PlannedIndirect;
    index: number;
    totalItems: number;
    isDragged: boolean;
    isSelected: boolean;
    onSelect: (id: string, selected: boolean) => void;
    onDragStart: (index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onUpdate: (updated: PlannedIndirect) => void;
    onDelete: (id: string) => void;
}

export const EditableIndirectRow: React.FC<Props> = ({
    indirect,
    index,
    totalItems,
    isDragged,
    isSelected,
    onSelect,
    onDragStart,
    onDragOver,
    onDragEnd,
    onMove,
    onUpdate,
    onDelete,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editDesc, setEditDesc] = useState(indirect.description);
    const [editCat, setEditCat] = useState(indirect.category);
    const [editValue, setEditValue] = useState(indirect.value);

    const handleSave = () => {
        onUpdate({
            ...indirect,
            category: editCat,
            description: editDesc.toUpperCase(),
            value: editValue,
        });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-blue-300 dark:border-blue-500 shadow-sm flex items-center">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                    <div className="md:col-span-3">
                        <select
                            value={editCat}
                            onChange={(e) => setEditCat(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
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
                        <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100 uppercase"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-1 flex gap-1">
                        <button
                            onClick={handleSave}
                            className="text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`bg-white dark:bg-slate-900/50 p-3 rounded-lg border flex justify-between items-center text-sm transition-all ${isDragged ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-inner' : (isSelected ? 'border-blue-300 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 shadow-sm')}`}
        >
            <div className="flex items-center gap-2 grow">
                <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900 mr-1"
                    checked={isSelected}
                    onChange={(e) => onSelect(indirect.id, e.target.checked)}
                />
                <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0">
                    <GripVertical size={16} />
                </div>
                <div className="grow text-slate-900 dark:text-slate-100 min-w-0">
                    <span className="break-words"><b className="text-slate-400 dark:text-slate-500">[{indirect.category}]</b> <b>{indirect.description}</b></span>
                </div>
            </div>
            <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="w-32 text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">R$ {indirect.value.toFixed(2)}</span>
                </div>
                <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="text-slate-300 dark:text-slate-600 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronUp size={14} /></button>
                    <button onClick={() => onMove(index, 'down')} disabled={index === totalItems - 1} className="text-slate-300 dark:text-slate-600 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronDown size={14} /></button>
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="text-slate-300 dark:text-slate-600 hover:text-blue-500 p-2"
                >
                    <Pencil size={14} />
                </button>
                <button
                    onClick={() => onDelete(indirect.id)}
                    className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
