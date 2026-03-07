import React, { useState, useCallback } from 'react';

export const useDragAndDrop = <T extends { id: string }>() => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = useCallback((index: number) => {
        setDraggedIndex(index);
    }, []);

    const handleDragOver = useCallback(
        (e: React.DragEvent, index: number, items: T[], setItems: (items: T[]) => void) => {
            e.preventDefault();
            if (draggedIndex !== null && draggedIndex !== index) {
                const newItems = [...items];
                const [draggedItem] = newItems.splice(draggedIndex, 1);
                newItems.splice(index, 0, draggedItem);
                setItems(newItems);
                setDraggedIndex(index);
            }
        },
        [draggedIndex]
    );

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    const moveItem = useCallback(
        (items: T[], setItems: (items: T[]) => void, index: number, direction: 'up' | 'down') => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= items.length) return;

            const newItems = [...items];
            [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
            setItems(newItems);
        },
        []
    );

    return {
        draggedIndex,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        moveItem,
    };
};
