import React, { useState } from 'react';
import { Package, Users, Archive, Percent, Trash2 } from 'lucide-react';
import { PlannedMaterial, PlannedLabor, PlannedIndirect, PlanTax, ResourceTab } from '../types';
import { AddMaterialForm } from '../forms/AddMaterialForm';
import { AddLaborForm } from '../forms/AddLaborForm';
import { AddIndirectForm } from '../forms/AddIndirectForm';
import { EditableMaterialRow } from '../rows/EditableMaterialRow';
import { EditableLaborRow } from '../rows/EditableLaborRow';
import { EditableIndirectRow } from '../rows/EditableIndirectRow';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';

interface ResourcesTabProps {
    planId: string;
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    calculations: any;
    onAddMaterial: (material: any) => void;
    onAddLabor: (labor: any) => void;
    onAddIndirect: (indirect: any) => void;
    onAddTax: (tax: any) => void;
    onUpdateMaterials: (materials: PlannedMaterial[]) => void;
    onUpdateLabor: (labor: PlannedLabor[]) => void;
    onUpdateIndirects: (indirects: PlannedIndirect[]) => void;
    onUpdateTaxes: (taxes: PlanTax[]) => void;
    onDeleteMaterial: (id: string) => void;
    onDeleteLabor: (id: string) => void;
    onDeleteIndirect: (id: string) => void;
    onDeleteTax: (id: string) => void;
    onDeleteMultipleMaterials?: (ids: string[]) => void;
    onDeleteMultipleLabor?: (ids: string[]) => void;
    onDeleteMultipleIndirects?: (ids: string[]) => void;
    activeResTab: ResourceTab;
    setActiveResTab: (tab: ResourceTab) => void;
}

export const ResourcesTab = React.memo(({
    planId,
    materials,
    labor,
    indirects,
    taxes,
    calculations,
    onAddMaterial,
    onAddLabor,
    onAddIndirect,
    onUpdateMaterials,
    onUpdateLabor,
    onUpdateIndirects,
    onUpdateTaxes,
    onDeleteMaterial,
    onDeleteLabor,
    onDeleteIndirect,
    onDeleteTax,
    onDeleteMultipleMaterials,
    onDeleteMultipleLabor,
    onDeleteMultipleIndirects,
    activeResTab,
    setActiveResTab,
}: ResourcesTabProps) => {
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [selectedLabor, setSelectedLabor] = useState<string[]>([]);
    const [selectedIndirects, setSelectedIndirects] = useState<string[]>([]);
    const { notify } = useNotify();

    const matDnD = useDragAndDrop<PlannedMaterial>((newOrder) => {
        onUpdateMaterials(newOrder);
        // Persist immediately: save all materials for this plan
        const allMats = db.load('serviflow_plan_materials', []) as PlannedMaterial[];
        const others = allMats.filter(m => m.plan_id !== planId);
        db.save('serviflow_plan_materials', [...others, ...newOrder]);
    });
    const labDnD = useDragAndDrop<PlannedLabor>((newOrder) => {
        onUpdateLabor(newOrder);
        const allLab = db.load('serviflow_plan_labor', []) as PlannedLabor[];
        const others = allLab.filter(l => l.plan_id !== planId);
        db.save('serviflow_plan_labor', [...others, ...newOrder]);
    });
    const indDnD = useDragAndDrop<PlannedIndirect>((newOrder) => {
        onUpdateIndirects(newOrder);
        const allInd = db.load('serviflow_plan_indirects', []) as PlannedIndirect[];
        const others = allInd.filter(i => i.plan_id !== planId);
        db.save('serviflow_plan_indirects', [...others, ...newOrder]);
    });

    const loadDefaultTaxes = () => {
        const defaults = [
            { name: 'ISS', rate: 5 },
            { name: 'PIS', rate: 0.65 },
            { name: 'COFINS', rate: 3 },
            { name: 'INSS', rate: 3.5 },
        ];

        const newTaxes = [...taxes];
        defaults.forEach((def) => {
            const idx = newTaxes.findIndex((t) => t.name === def.name);
            if (idx !== -1) {
                newTaxes[idx] = { ...newTaxes[idx], rate: def.rate, value: 0 };
            } else {
                newTaxes.push({
                    id: db.generateId('TAX'),
                    plan_id: planId,
                    name: def.name,
                    rate: def.rate,
                    value: 0,
                });
            }
        });
        onUpdateTaxes(newTaxes);
        notify('Impostos padrão carregados!', 'success');
    };

    return (
        <div className="w-full space-y-6">

            <div className="min-h-[300px]">
                {activeResTab === 'material' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Insumos e Materiais</h3>
                        </div>
                        {materials.length > 0 && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={selectedMaterials.length === materials.length && materials.length > 0}
                                        onChange={(e) => setSelectedMaterials(e.target.checked ? materials.map(m => m.id) : [])}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMaterials.length} SELECIONADO(S)</span>
                                </div>
                                <div className="flex gap-2">
                                    {selectedMaterials.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (onDeleteMultipleMaterials) {
                                                    onDeleteMultipleMaterials(selectedMaterials);
                                                    setSelectedMaterials([]);
                                                } else {
                                                    if (confirm(`Excluir ${selectedMaterials.length} material(is) selecionado(s)?`)) {
                                                        selectedMaterials.forEach(id => onDeleteMaterial(id));
                                                        setSelectedMaterials([]);
                                                    }
                                                }
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-800"
                                        >
                                            <Trash2 size={12} /> Excluir Selecionados
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (onDeleteMultipleMaterials) {
                                                onDeleteMultipleMaterials(materials.map(m => m.id));
                                                setSelectedMaterials([]);
                                            } else {
                                                if (confirm('Excluir TODOS os materiais deste planejamento?')) {
                                                    materials.forEach(m => onDeleteMaterial(m.id));
                                                    setSelectedMaterials([]);
                                                }
                                            }
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        <Archive size={12} /> Limpar Lista
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {materials.map((m, index) => (
                                <EditableMaterialRow
                                    key={m.id}
                                    material={m}
                                    index={index}
                                    isDragged={matDnD.draggedIndex === index}
                                    isSelected={selectedMaterials.includes(m.id)}
                                    onSelect={(id, sel) => setSelectedMaterials(prev => sel ? [...prev, id] : prev.filter(i => i !== id))}
                                    onDragStart={matDnD.handleDragStart}
                                    onDragOver={(e, idx) => matDnD.handleDragOver(e, idx, materials, onUpdateMaterials)}
                                    onDragEnd={matDnD.handleDragEnd}
                                    onMove={(idx, dir) => matDnD.moveItem(materials, onUpdateMaterials, idx, dir)}
                                    onUpdate={(up) => onUpdateMaterials(materials.map(i => i.id === up.id ? up : i))}
                                    onDelete={onDeleteMaterial}
                                    isFirst={index === 0}
                                    isLast={index === materials.length - 1}
                                />
                            ))}
                        </div>
                        {materials.length === 0 && (
                            <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum material lançado ainda.</p>
                            </div>
                        )}
                        {materials.length > 0 && (
                            <div className="flex justify-end p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total Materiais</span>
                                    <span className="text-xl font-black text-blue-700">R$ {(calculations.totalMaterial || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeResTab === 'mo' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Mão de Obra</h3>
                        </div>
                        {labor.length > 0 && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-4 mb-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={selectedLabor.length === labor.length && labor.length > 0}
                                        onChange={(e) => setSelectedLabor(e.target.checked ? labor.map(l => l.id) : [])}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedLabor.length} SELECIONADO(S)</span>
                                </div>
                                <div className="flex gap-2">
                                    {selectedLabor.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (onDeleteMultipleLabor) {
                                                    onDeleteMultipleLabor(selectedLabor);
                                                    setSelectedLabor([]);
                                                } else {
                                                    if (confirm(`Excluir ${selectedLabor.length} item(ns) de mão de obra selecionado(s)?`)) {
                                                        selectedLabor.forEach(id => onDeleteLabor(id));
                                                        setSelectedLabor([]);
                                                    }
                                                }
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-800"
                                        >
                                            <Trash2 size={12} /> Excluir Selecionados
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (onDeleteMultipleLabor) {
                                                onDeleteMultipleLabor(labor.map(l => l.id));
                                                setSelectedLabor([]);
                                            } else {
                                                if (confirm('Excluir TODA a mão de obra deste planejamento?')) {
                                                    labor.forEach(l => onDeleteLabor(l.id));
                                                    setSelectedLabor([]);
                                                }
                                            }
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        <Archive size={12} /> Limpar Lista
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {labor.map((l, index) => (
                                <EditableLaborRow
                                    key={l.id}
                                    labor={l}
                                    index={index}
                                    isDragged={labDnD.draggedIndex === index}
                                    isSelected={selectedLabor.includes(l.id)}
                                    onSelect={(id, sel) => setSelectedLabor(prev => sel ? [...prev, id] : prev.filter(i => i !== id))}
                                    onDragStart={labDnD.handleDragStart}
                                    onDragOver={(e, idx) => labDnD.handleDragOver(e, idx, labor, onUpdateLabor)}
                                    onDragEnd={labDnD.handleDragEnd}
                                    onMove={(idx, dir) => labDnD.moveItem(labor, onUpdateLabor, idx, dir)}
                                    onUpdate={(up) => onUpdateLabor(labor.map(i => i.id === up.id ? up : i))}
                                    onDelete={onDeleteLabor}
                                    isFirst={index === 0}
                                    isLast={index === labor.length - 1}
                                />
                            ))}
                            {labor.length === 0 && (
                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma mão de obra lançada.</p>
                                </div>
                            )}
                        </div>
                        {labor.length > 0 && (
                            <div className="flex justify-end p-4 bg-amber-50/50 rounded-xl border border-amber-100 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Total Mão de Obra</span>
                                    <span className="text-xl font-black text-amber-700">R$ {(calculations.totalLabor || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeResTab === 'indireto' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Custos Indiretos</h3>
                        </div>
                        {indirects.length > 0 && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-4 mb-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={selectedIndirects.length === indirects.length && indirects.length > 0}
                                        onChange={(e) => setSelectedIndirects(e.target.checked ? indirects.map(i => i.id) : [])}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedIndirects.length} SELECIONADO(S)</span>
                                </div>
                                <div className="flex gap-2">
                                    {selectedIndirects.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (onDeleteMultipleIndirects) {
                                                    onDeleteMultipleIndirects(selectedIndirects);
                                                    setSelectedIndirects([]);
                                                } else {
                                                    if (confirm(`Excluir ${selectedIndirects.length} custo(s) indireto(s) selecionado(s)?`)) {
                                                        selectedIndirects.forEach(id => onDeleteIndirect(id));
                                                        setSelectedIndirects([]);
                                                    }
                                                }
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-800"
                                        >
                                            <Trash2 size={12} /> Excluir Selecionados
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (onDeleteMultipleIndirects) {
                                                onDeleteMultipleIndirects(indirects.map(i => i.id));
                                                setSelectedIndirects([]);
                                            } else {
                                                if (confirm('Excluir TODOS os custos indiretos deste planejamento?')) {
                                                    indirects.forEach(i => onDeleteIndirect(i.id));
                                                    setSelectedIndirects([]);
                                                }
                                            }
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        <Archive size={12} /> Limpar Lista
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {indirects.map((i, index) => (
                                <EditableIndirectRow
                                    key={i.id}
                                    indirect={i}
                                    index={index}
                                    isDragged={indDnD.draggedIndex === index}
                                    isSelected={selectedIndirects.includes(i.id)}
                                    onSelect={(id, sel) => setSelectedIndirects(prev => sel ? [...prev, id] : prev.filter(i => i !== id))}
                                    onDragStart={indDnD.handleDragStart}
                                    onDragOver={(e, idx) => indDnD.handleDragOver(e, idx, indirects, onUpdateIndirects)}
                                    onDragEnd={indDnD.handleDragEnd}
                                    onMove={(idx, dir) => indDnD.moveItem(indirects, onUpdateIndirects, idx, dir)}
                                    onUpdate={(up) => onUpdateIndirects(indirects.map(item => item.id === up.id ? up : item))}
                                    onDelete={onDeleteIndirect}
                                    isFirst={index === 0}
                                    isLast={index === indirects.length - 1}
                                />
                            ))}
                            {indirects.length === 0 && (
                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum custo indireto lançado.</p>
                                </div>
                            )}
                        </div>
                        {indirects.length > 0 && (
                            <div className="flex justify-end p-4 bg-slate-100/50 rounded-xl border border-slate-200 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Indiretos</span>
                                    <span className="text-xl font-black text-slate-700">R$ {(calculations.totalIndirect || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeResTab === 'impostos' && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Impostos e BDI</h4>
                            <button
                                onClick={loadDefaultTaxes}
                                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"
                            >
                                Carregar Padrão
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {['BDI', 'ISS', 'PIS', 'COFINS', 'INSS'].map(name => {
                                const taxValue = name === 'BDI'
                                    ? calculations.bdiValue
                                    : calculations.individualTaxValues.find((t: any) => t.name === name)?.value || 0;

                                return (
                                    <div key={name} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{name} (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-sm font-bold outline-none mb-1"
                                            value={taxes.find(t => t.name === name)?.rate || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newTaxes = [...taxes];
                                                const idx = newTaxes.findIndex(t => t.name === name);
                                                if (idx !== -1) newTaxes[idx] = { ...newTaxes[idx], rate: val };
                                                else newTaxes.push({ id: db.generateId('TAX'), plan_id: planId, name, rate: val, value: 0 });
                                                onUpdateTaxes(newTaxes);
                                            }}
                                        />
                                        <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 text-right">
                                            R$ {taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
