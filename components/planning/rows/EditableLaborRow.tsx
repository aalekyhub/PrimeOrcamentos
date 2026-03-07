import React, { useState } from 'react';
import { GripVertical, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { PlannedLabor } from '../types';

interface EditableLaborRowProps {
    labor: PlannedLabor;
    index: number;
    isDragged: boolean;
    onDragStart: (index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onDelete: (id: string) => void;
    onUpdate: (updated: PlannedLabor) => void;
    isFirst: boolean;
    isLast: boolean;
    isSelected: boolean;
    onSelect: (id: string, selected: boolean) => void;
}

export const EditableLaborRow: React.FC<EditableLaborRowProps> = ({
    labor,
    index,
    isDragged,
    onDragStart,
    onDragOver,
    onDragEnd,
    onMove,
    onDelete,
    onUpdate,
    isFirst,
    isLast,
    isSelected,
    onSelect,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editRole, setEditRole] = useState(labor.role);
    const [editUnit, setEditUnit] = useState(labor.unit);
    const [editQty, setEditQty] = useState(labor.quantity);
    const [editCost, setEditCost] = useState(labor.unit_cost);

    const handleSave = () => {
        onUpdate({
            ...labor,
            role: editRole.toUpperCase(),
            unit: editUnit.toUpperCase(),
            quantity: editQty,
            unit_cost: editCost,
            total_cost: editQty * editCost,
        });
        setIsEditing(false);
    };

    return (
        <div
            draggable={!isEditing}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`bg-white dark:bg-slate-900/50 p-3 rounded-lg border flex justify-between items-center text-sm transition-all ${isDragged
                    ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20 border-blue-200'
                    : isSelected
                        ? 'border-blue-300 bg-blue-50/30'
                        : 'border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
        >
            {isEditing ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                    <div className="md:col-span-5">
                        <input
                            type="text"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 rounded text-xs font-bold uppercase"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 rounded text-xs"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 rounded text-xs"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="number"
                            value={editCost}
                            onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 rounded text-xs"
                        />
                    </div>
                    <div className="md:col-span-1 flex gap-1">
                        <button onClick={handleSave} className="text-green-600 p-1 hover:bg-green-50 rounded">
                            <Check size={16} />
                        </button>
                        <button onClick={() => setIsEditing(false)} className="text-red-600 p-1 hover:bg-red-50 rounded">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 grow">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelect(labor.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                        />
                        <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
                            <GripVertical size={16} />
                        </div>
                        <div className="grow">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{labor.role}</p>
                            <p className="text-[10px] text-slate-500">
                                {labor.cost_type} | {labor.quantity} {labor.unit} x R$ {labor.unit_cost.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="w-24 text-right mr-4 font-bold text-slate-800 dark:text-slate-100">
                        R$ {labor.total_cost.toFixed(2)}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => onMove(index, 'up')} disabled={isFirst} className="text-slate-300 hover:text-blue-500 disabled:opacity-0">
                            <ChevronUp size={14} />
                        </button>
                        <button onClick={() => onMove(index, 'down')} disabled={isLast} className="text-slate-300 hover:text-blue-500 disabled:opacity-0">
                            <ChevronDown size={14} />
                        </button>
                        <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-blue-500 p-1">
                            <Pencil size={14} />
                        </button>
                        <button onClick={() => onDelete(labor.id)} className="text-slate-300 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
