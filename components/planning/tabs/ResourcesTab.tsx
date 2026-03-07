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
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({
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
}) => {
    const [activeResTab, setActiveResTab] = useState<ResourceTab>('material');
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [selectedLabor, setSelectedLabor] = useState<string[]>([]);
    const [selectedIndirects, setSelectedIndirects] = useState<string[]>([]);
    const { notify } = useNotify();

    const matDnD = useDragAndDrop<PlannedMaterial>();
    const labDnD = useDragAndDrop<PlannedLabor>();
    const indDnD = useDragAndDrop<PlannedIndirect>();

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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="px-6 pb-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex gap-1.5 my-3 justify-center">
                    {[
                        { id: 'material', label: 'Materiais' },
                        { id: 'mo', label: 'Mão de Obra' },
                        { id: 'indireto', label: 'Indiretos' },
                        { id: 'impostos', label: 'Impostos' },
                    ].map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => setActiveResTab(r.id as ResourceTab)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${activeResTab === r.id
                                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-[300px]">
                {activeResTab === 'material' && (
                    <div className="space-y-4">
                        <AddMaterialForm planId={planId} onAdd={onAddMaterial} />
                        {materials.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300"
                                        checked={selectedMaterials.length === materials.length && materials.length > 0}
                                        onChange={(e) => setSelectedMaterials(e.target.checked ? materials.map(m => m.id) : [])}
                                    />
                                    <span className="text-xs font-semibold text-slate-600">{selectedMaterials.length} selecionado(s)</span>
                                </div>
                                {selectedMaterials.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm(`Excluir ${selectedMaterials.length} materiais?`)) {
                                                onUpdateMaterials(materials.filter(m => !selectedMaterials.includes(m.id)));
                                                setSelectedMaterials([]);
                                            }
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold border border-red-100"
                                    >
                                        <Trash2 size={12} /> Excluir Selecionados
                                    </button>
                                )}
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
                        {materials.length > 0 && (
                            <div className="flex justify-end p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total Materiais</span>
                                    <span className="text-xl font-black text-blue-700">R$ {calculations.totalMaterial.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeResTab === 'mo' && (
                    <div className="space-y-4">
                        <AddLaborForm planId={planId} onAdd={onAddLabor} />
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
                        </div>
                        {labor.length > 0 && (
                            <div className="flex justify-end p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Total Mão de Obra</span>
                                    <span className="text-xl font-black text-amber-700">R$ {calculations.totalLabor.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeResTab === 'indireto' && (
                    <div className="space-y-4">
                        <AddIndirectForm planId={planId} onAdd={onAddIndirect} />
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
                        </div>
                        {indirects.length > 0 && (
                            <div className="flex justify-end p-4 bg-slate-100/50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Indiretos</span>
                                    <span className="text-xl font-black text-slate-700">R$ {calculations.totalIndirect.toFixed(2)}</span>
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
                            {['BDI', 'ISS', 'PIS', 'COFINS', 'INSS'].map(name => (
                                <div key={name} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{name} (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-sm font-bold outline-none"
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
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
