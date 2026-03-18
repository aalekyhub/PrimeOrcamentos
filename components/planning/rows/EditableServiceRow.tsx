import React, { useState } from 'react';
import { GripVertical, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { PlannedService } from '../types';

interface EditableServiceRowProps {
    service: PlannedService;
    index: number;
    isDragged: boolean;
    onDragStart: (index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onDelete: (id: string) => void;
    onUpdate: (updatedService: PlannedService) => void;
    isFirst: boolean;
    isLast: boolean;
    isSelected: boolean;
    onSelect: (id: string, selected: boolean) => void;
}

export const EditableServiceRow: React.FC<EditableServiceRowProps> = ({
    service,
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
    const [editDesc, setEditDesc] = useState(service.description);
    const [editUnit, setEditUnit] = useState(service.unit);
    const [editQty, setEditQty] = useState(service.quantity);
    const [editMatCost, setEditMatCost] = useState(service.unit_material_cost);
    const [editLabCost, setEditLabCost] = useState(service.unit_labor_cost);

    const handleSave = () => {
        onUpdate({
            ...service,
            description: editDesc.toUpperCase(),
            unit: editUnit.toUpperCase(),
            quantity: editQty,
            unit_material_cost: editMatCost,
            unit_labor_cost: editLabCost,
            total_cost: editQty * (editMatCost + editLabCost),
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditDesc(service.description);
        setEditUnit(service.unit);
        setEditQty(service.quantity);
        setEditMatCost(service.unit_material_cost);
        setEditLabCost(service.unit_labor_cost);
        setIsEditing(false);
    };

    return (
        <div
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            onKeyDown={(e) => {
                if (!isEditing) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            }}
            className={`bg-white dark:bg-slate-900/50 p-4 rounded-xl border transition-all flex justify-between items-center group hover:border-blue-300 dark:hover:border-blue-500 ${isDragged
                ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-inner'
                : 'border-slate-200 dark:border-slate-800 shadow-sm'
                } ${isEditing ? 'ring-2 ring-blue-400/30' : ''}`}
        >
            {isEditing ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-4">
                        <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-slate-900 dark:text-slate-100 uppercase"
                            autoFocus
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="number"
                            value={editMatCost}
                            onChange={(e) => setEditMatCost(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                            placeholder="Mat."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <input
                            type="number"
                            value={editLabCost}
                            onChange={(e) => setEditLabCost(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                            placeholder="M.O."
                        />
                    </div>
                    <div className="md:col-span-1 flex gap-1">
                        <button
                            onClick={handleSave}
                            className="text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        >
                            <Check size={18} />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 grow">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelect(service.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                        />
                        <div
                            draggable
                            onDragStart={() => onDragStart(index)}
                            className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0"
                        >
                            <GripVertical size={18} />
                        </div>
                        <div className="grow">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{service.description}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {service.quantity} {service.unit} x (Mat: {service.unit_material_cost.toFixed(2)} + MO:{' '}
                                {service.unit_labor_cost.toFixed(2)})
                            </p>
                        </div>
                    </div>
                    <div className="w-32 text-right mr-4 shrink-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            R$ {service.total_cost.toFixed(2)}
                        </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <div className="flex items-center gap-1 mr-2">
                            <button
                                onClick={() => onMove(index, 'up')}
                                disabled={isFirst}
                                className="text-slate-300 dark:text-slate-600 hover:text-blue-500 disabled:opacity-0 transition-colors"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={() => onMove(index, 'down')}
                                disabled={isLast}
                                className="text-slate-300 dark:text-slate-600 hover:text-blue-500 disabled:opacity-0 transition-colors"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-slate-300 dark:text-slate-600 hover:text-blue-500 p-2"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(service.id)}
                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
