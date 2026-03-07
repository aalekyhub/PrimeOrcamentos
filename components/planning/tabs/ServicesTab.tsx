import React from 'react';
import { PlannedService } from '../../../types';
import { AddServiceForm } from '../forms/AddServiceForm';
import { EditableServiceRow } from '../rows/EditableServiceRow';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

interface Props {
    planId: string;
    services: PlannedService[];
    onSetServices: (services: PlannedService[]) => void;
    onDeleteService: (id: string) => void;
}

export const ServicesTab: React.FC<Props> = ({ planId, services, onSetServices, onDeleteService }) => {
    const { draggedIndex, handleDragStart, handleDragOver, handleDragEnd, moveItem } = useDragAndDrop<PlannedService>();

    const handleUpdateService = (updated: PlannedService) => {
        onSetServices(services.map((s) => (s.id === updated.id ? updated : s)));
    };

    const handleAddService = (newService: PlannedService) => {
        onSetServices([...services, newService]);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <AddServiceForm planId={planId} onAdd={handleAddService} />

            <div className="space-y-2">
                {services.map((svc, index) => (
                    <EditableServiceRow
                        key={svc.id}
                        service={svc}
                        index={index}
                        totalItems={services.length}
                        isDragged={draggedIndex === index}
                        onDragStart={handleDragStart}
                        onDragOver={(e, idx) => handleDragOver(e, idx, services, onSetServices)}
                        onDragEnd={handleDragEnd}
                        onMove={(idx, dir) => moveItem(services, onSetServices, idx, dir)}
                        onUpdate={handleUpdateService}
                        onDelete={onDeleteService}
                    />
                ))}
                {services.length === 0 && (
                    <div className="text-center py-10 text-slate-400">Nenhum serviço planejado ainda.</div>
                )}
            </div>
        </div>
    );
};
