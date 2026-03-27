import React from 'react';
import { Trash2, Archive } from 'lucide-react';
import { PlannedService } from '../types';
import { EditableServiceRow } from '../rows/EditableServiceRow';
import { AddServiceForm } from '../forms/AddServiceForm';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { db } from '../../../services/db';

interface ServicesTabProps {
    services: PlannedService[];
    onAddService: (service: Omit<PlannedService, 'id' | 'plan_id' | 'total_cost'>) => void;
    onUpdateService: (updatedService: PlannedService) => void;
    onDeleteService: (id: string) => void;
    onDeleteMultipleServices?: (ids: string[]) => void;
    onReorderServices: (newServices: PlannedService[]) => void;
    planId: string;
}

export const ServicesTab = React.memo(({
    services,
    onAddService,
    onUpdateService,
    onDeleteService,
    onDeleteMultipleServices,
    onReorderServices,
    planId,
}: ServicesTabProps) => {
    const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
    const { draggedIndex, handleDragStart, handleDragOver, handleDragEnd, moveItem } =
        useDragAndDrop<PlannedService>((newOrder) => {
            onReorderServices(newOrder);
            // Persist immediately
            const allSvcs = db.load('serviflow_plan_services', []) as PlannedService[];
            const others = allSvcs.filter(s => s.plan_id !== planId);
            db.save('serviflow_plan_services', [...others, ...newOrder]);
        });

    const handleMove = (index: number, direction: 'up' | 'down') => {
        moveItem(services, onReorderServices, index, direction);
    };


    const handleDeleteSelected = () => {
        if (selectedServices.length === 0) return;
        if (onDeleteMultipleServices) {
            onDeleteMultipleServices(selectedServices);
            setSelectedServices([]);
        } else {
            // Fallback if prop not provided (though it should be)
            if (confirm(`Excluir ${selectedServices.length} serviço(s) selecionado(s)?`)) {
                selectedServices.forEach(id => onDeleteService(id));
                setSelectedServices([]);
            }
        }
    };

    const handleClearAll = () => {
        if (services.length === 0) return;
        if (onDeleteMultipleServices) {
            onDeleteMultipleServices(services.map(s => s.id));
            setSelectedServices([]);
        } else {
            if (confirm('Excluir TODOS os serviços deste planejamento?')) {
                services.forEach(s => onDeleteService(s.id));
                setSelectedServices([]);
            }
        }
    };

    return (
        <div className="w-full">
            {services.length > 0 && (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-6 mb-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedServices.length === services.length && services.length > 0}
                            onChange={(e) => setSelectedServices(e.target.checked ? services.map(s => s.id) : [])}
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {selectedServices.length} SELECIONADO(S)
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {selectedServices.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-800"
                            >
                                <Trash2 size={12} /> Excluir Selecionados
                            </button>
                        )}
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                        >
                            <Archive size={12} /> Limpar Lista
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2 mt-4">
                {services.map((service, index) => (
                    <EditableServiceRow
                        key={service.id}
                        service={service}
                        index={index}
                        isDragged={draggedIndex === index}
                        isSelected={selectedServices.includes(service.id)}
                        onSelect={(id, sel) => setSelectedServices(prev => sel ? [...prev, id] : prev.filter(i => i !== id))}
                        onDragStart={handleDragStart}
                        onDragOver={(e, i) => handleDragOver(e, i, services, onReorderServices)}
                        onDragEnd={handleDragEnd}
                        onMove={handleMove}
                        onDelete={onDeleteService}
                        onUpdate={onUpdateService}
                        isFirst={index === 0}
                        isLast={index === services.length - 1}
                    />
                ))}

                {services.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum serviço lançado.</p>
                    </div>
                )}
            </div>
        </div>
    );
});
