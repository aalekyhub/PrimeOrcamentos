import React, { useState } from 'react';
import { Plus, GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { ServiceItem, CatalogService } from '../../types';
import { db } from '../../services/db';

interface BudgetItemsEditorProps {
    items: ServiceItem[];
    setItems: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
    catalogServices: CatalogService[];
    subtotal: number;
}

const BudgetItemsEditor: React.FC<BudgetItemsEditorProps> = ({
    items,
    setItems,
    catalogServices,
    subtotal
}) => {
    const [selectedCatalogId, setSelectedCatalogId] = useState("");
    const [currentDesc, setCurrentDesc] = useState("");
    const [currentQty, setCurrentQty] = useState<number>(0);
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [currentUnit, setCurrentUnit] = useState<string>("un");
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const handleAddItem = () => {
        if (!currentDesc || currentPrice <= 0 || currentQty <= 0) return;
        setItems(prev => [...prev, {
            id: db.generateId('ITEM'),
            description: currentDesc,
            quantity: currentQty,
            unitPrice: currentPrice,
            unit: currentUnit
        }]);
        setCurrentDesc('');
        setCurrentQty(0);
        setCurrentPrice(0);
        setCurrentUnit('un');
        setSelectedCatalogId('');
    };

    const updateItem = (id: string, field: keyof ServiceItem, value: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const updateItemTotal = (id: string, newTotal: number) => {
        setItems(prev => prev.map(item => {
            if (item.id === id && item.quantity > 0) {
                return { ...item, unitPrice: newTotal / item.quantity };
            }
            return item;
        }));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= items.length) return;
        const newItems = [...items];
        [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
        setItems(newItems);
    };

    return (
        <div>
            <div className="mb-4">
                <label className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1.5">Puxar do Catalogo</label>
                <select className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 outline-none" value={selectedCatalogId} onChange={e => {
                    const id = e.target.value;
                    setSelectedCatalogId(id);
                    const s = catalogServices.find(x => x.id === id);
                    if (s) { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'un'); }
                }}>
                    <option value="">Selecione para preencher...</option>
                    {catalogServices.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-6">
                    <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block ml-1">Descrição</label>
                    <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                </div>
                <div className="w-24">
                    <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block text-center">Unit</label>
                    <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black text-center outline-none uppercase text-slate-900 dark:text-slate-100" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} />
                </div>
                <div className="w-24">
                    <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block text-center">Qtd</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black text-center outline-none text-slate-900 dark:text-slate-100" value={currentQty || ''} onChange={e => setCurrentQty(Number(e.target.value))} />
                </div>
                <div className="w-32">
                    <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block ml-1">Preço (R$)</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black outline-none text-slate-900 dark:text-slate-100" value={currentPrice || ''} onChange={e => setCurrentPrice(Number(e.target.value))} />
                </div>
                <div className="md:col-span-1">
                    <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[58px] rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-blue-950/30"><Plus className="w-6 h-6" /></button>
                </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar mt-4">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggedItemIndex(index)}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedItemIndex !== null && draggedItemIndex !== index) {
                                const newItems = [...items];
                                const draggedItem = newItems[draggedItemIndex];
                                newItems.splice(draggedItemIndex, 1);
                                newItems.splice(index, 0, draggedItem);
                                setItems(newItems);
                                setDraggedItemIndex(index);
                            }
                        }}
                        onDragEnd={() => setDraggedItemIndex(null)}
                        className={`flex justify-between items-center p-2.5 rounded-lg border group gap-2 transition-all ${draggedItemIndex === index ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-blue-200 cursor-default'}`}
                    >
                        <div className="flex items-center gap-2 grow">
                            <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0">
                                <GripVertical size={14} />
                            </div>
                            <div className="grow">
                                <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase mb-1">{item.description}</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                                        <span className="text-[8px] font-bold text-slate-400">QTD:</span>
                                        <input type="number" className="w-12 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-200 outline-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                                        <span className="text-[8px] font-bold text-slate-400">VALOR:</span>
                                        <input type="number" className="w-20 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-200 outline-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                                <span className="text-[8px] font-bold text-slate-400">TOTAL:</span>
                                <input type="number" className="w-24 bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none text-right" value={Number((item.unitPrice * item.quantity).toFixed(2))} onChange={e => updateItemTotal(item.id, Number(e.target.value))} />
                            </div>
                            <div className="flex flex-col gap-0">
                                <button onClick={() => moveItem(items.indexOf(item), 'up')} disabled={items.indexOf(item) === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><ChevronUp className="w-3 h-3" /></button>
                                <button onClick={() => moveItem(items.indexOf(item), 'down')} disabled={items.indexOf(item) === items.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><ChevronDown className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-rose-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length > 0 && (
                <div className="flex justify-end pt-2 mt-4">
                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subtotal dos Itens</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetItemsEditor;
