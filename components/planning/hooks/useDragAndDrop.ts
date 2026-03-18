import React, { useState, useCallback, useRef } from 'react';

export const useDragAndDrop = <T extends { id: string }>(onOrderChange?: (items: T[]) => void) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    // Keep a ref to the latest reordered list so handleDragEnd can persist it
    const latestItemsRef = useRef<T[] | null>(null);

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
                latestItemsRef.current = newItems;
                setDraggedIndex(index);
            }
        },
        [draggedIndex]
    );

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
        // Persist the new order immediately after drop
        if (onOrderChange && latestItemsRef.current) {
            onOrderChange(latestItemsRef.current);
            latestItemsRef.current = null;
        }
    }, [onOrderChange]);

    const moveItem = useCallback(
        (items: T[], setItems: (items: T[]) => void, index: number, direction: 'up' | 'down') => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= items.length) return;

            const newItems = [...items];
            [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
            setItems(newItems);
            // Persist immediately when using arrow buttons too
            if (onOrderChange) {
                onOrderChange(newItems);
            }
        },
        [onOrderChange]
    );

    return {
        draggedIndex,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        moveItem,
    };
};
