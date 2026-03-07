import React from 'react';
import { PlannedService } from '../types';
import { EditableServiceRow } from '../rows/EditableServiceRow';
import { AddServiceForm } from '../forms/AddServiceForm';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

interface ServicesTabProps {
    services: PlannedService[];
    onAddService: (service: Omit<PlannedService, 'id' | 'plan_id' | 'total_cost'>) => void;
    onUpdateService: (updatedService: PlannedService) => void;
    onDeleteService: (id: string) => void;
    onReorderServices: (newServices: PlannedService[]) => void;
    planId: string;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
    services,
    onAddService,
    onUpdateService,
    onDeleteService,
    onReorderServices,
    planId,
}) => {
    const { draggedIndex, handleDragStart, handleDragOver, handleDragEnd, moveItem } =
        useDragAndDrop<PlannedService>();

    const handleMove = (index: number, direction: 'up' | 'down') => {
        moveItem(services, onReorderServices, index, direction);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <AddServiceForm onAdd={onAddService} planId={planId} />

            <div className="space-y-2 mt-6">
                {services.map((service, index) => (
                    <EditableServiceRow
                        key={service.id}
                        service={service}
                        index={index}
                        isDragged={draggedIndex === index}
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
};
