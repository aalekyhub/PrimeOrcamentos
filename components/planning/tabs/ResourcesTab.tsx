import React, { useState } from 'react';
import { Package, Users, Archive, Percent, Trash2 } from 'lucide-react';
import { PlannedMaterial, PlannedLabor, PlannedIndirect, PlanTax } from '../../../types';
import { AddMaterialForm } from '../forms/AddMaterialForm';
import { AddLaborForm } from '../forms/AddLaborForm';
import { AddIndirectForm } from '../forms/AddIndirectForm';
import { EditableMaterialRow } from '../rows/EditableMaterialRow';
import { EditableLaborRow } from '../rows/EditableLaborRow';
import { EditableIndirectRow } from '../rows/EditableIndirectRow';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';

interface Props {
    planId: string;
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    totalMaterial: number;
    totalLabor: number;
    totalIndirect: number;
    totalDirect: number;
    totalGeneral: number;
    onSetMaterials: (items: PlannedMaterial[]) => void;
    onSetLabor: (items: PlannedLabor[]) => void;
    onSetIndirects: (items: PlannedIndirect[]) => void;
    onSetTaxes: (items: PlanTax[]) => void;
    onDeleteMaterial: (id: string) => void;
    onDeleteLabor: (id: string) => void;
    onDeleteIndirect: (id: string) => void;
    onDeleteTax: (id: string) => void;
}

export const ResourcesTab: React.FC<Props> = ({
    planId,
    materials,
    labor,
    indirects,
    taxes,
    totalMaterial,
    totalLabor,
    totalIndirect,
    totalDirect,
    totalGeneral,
    onSetMaterials,
    onSetLabor,
    onSetIndirects,
    onSetTaxes,
    onDeleteMaterial,
    onDeleteLabor,
    onDeleteIndirect,
    onDeleteTax,
}) => {
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto' | 'impostos'>('material');
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [selectedLabor, setSelectedLabor] = useState<string[]>([]);
    const [selectedIndirects, setSelectedIndirects] = useState<string[]>([]);
    const { notify } = useNotify();

    const matDnD = useDragAndDrop<PlannedMaterial>();
    const labDnD = useDragAndDrop<PlannedLabor>();
    const indDnD = useDragAndDrop<PlannedIndirect>();

    const handleSelectMaterial = (id: string, selected: boolean) => {
        setSelectedMaterials((prev) => (selected ? [...prev, id] : prev.filter((i) => i !== id)));
    };

    const handleSelectLabor = (id: string, selected: boolean) => {
        setSelectedLabor((prev) => (selected ? [...prev, id] : prev.filter((i) => i !== id)));
    };

    const handleSelectIndirect = (id: string, selected: boolean) => {
        setSelectedIndirects((prev) => (selected ? [...prev, id] : prev.filter((i) => i !== id)));
    };

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
        onSetTaxes(newTaxes);
        notify('Impostos padrão carregados!', 'success');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                {[
                    { id: 'material', label: 'Materiais', icon: Package },
                    { id: 'mo', label: 'Mão de Obra', icon: Users },
                    { id: 'indireto', label: 'Indiretos', icon: Archive },
                    { id: 'impostos', label: 'Impostos/BDI', icon: Percent },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setResourceTab(t.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${resourceTab === t.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <t.icon size={16} /> <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            <div className="min-h-[300px]">
                {resourceTab === 'material' && (
                    <div>
                        <AddMaterialForm planId={planId} onAdd={(m) => onSetMaterials([...materials, m])} />
                        {materials.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                                        checked={selectedMaterials.length === materials.length && materials.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedMaterials(materials.map((m) => m.id));
                                            else setSelectedMaterials([]);
                                        }}
                                    />
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        {selectedMaterials.length} selecionado(s)
                                    </span>
                                </div>
                                {selectedMaterials.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Excluir ${selectedMaterials.length} materiais?`)) {
                                                const remaining = materials.filter((m) => !selectedMaterials.includes(m.id));
                                                onSetMaterials(remaining);
                                                // Using current bulk delete strategy but ideally granular
                                                // In this app, bulk delete just saves the remaining list.
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
                                    totalItems={materials.length}
                                    isDragged={matDnD.draggedIndex === index}
                                    isSelected={selectedMaterials.includes(m.id)}
                                    onSelect={handleSelectMaterial}
                                    onDragStart={matDnD.handleDragStart}
                                    onDragOver={(e, idx) => matDnD.handleDragOver(e, idx, materials, onSetMaterials)}
                                    onDragEnd={matDnD.handleDragEnd}
                                    onMove={(idx, dir) => matDnD.moveItem(materials, onSetMaterials, idx, dir)}
                                    onUpdate={(up) => onSetMaterials(materials.map((i) => (i.id === up.id ? up : i)))}
                                    onDelete={onDeleteMaterial}
                                />
                            ))}
                        </div>
                        {materials.length > 0 && (
                            <div className="flex justify-end items-center p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-blue-600/60 dark:text-blue-400/60 uppercase tracking-[0.2em]">Total Materiais</span>
                                    <span className="text-xl font-black text-blue-700 dark:text-blue-400">R$ {totalMaterial.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {resourceTab === 'mo' && (
                    <div>
                        <AddLaborForm planId={planId} onAdd={(l) => onSetLabor([...labor, l])} />
                        {labor.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                                        checked={selectedLabor.length === labor.length && labor.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedLabor(labor.map((l) => l.id));
                                            else setSelectedLabor([]);
                                        }}
                                    />
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        {selectedLabor.length} selecionado(s)
                                    </span>
                                </div>
                                {selectedLabor.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Excluir ${selectedLabor.length} itens?`)) {
                                                onSetLabor(labor.filter((l) => !selectedLabor.includes(l.id)));
                                                setSelectedLabor([]);
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
                            {labor.map((l, index) => (
                                <EditableLaborRow
                                    key={l.id}
                                    labor={l}
                                    index={index}
                                    totalItems={labor.length}
                                    isDragged={labDnD.draggedIndex === index}
                                    isSelected={selectedLabor.includes(l.id)}
                                    onSelect={handleSelectLabor}
                                    onDragStart={labDnD.handleDragStart}
                                    onDragOver={(e, idx) => labDnD.handleDragOver(e, idx, labor, onSetLabor)}
                                    onDragEnd={labDnD.handleDragEnd}
                                    onMove={(idx, dir) => labDnD.moveItem(labor, onSetLabor, idx, dir)}
                                    onUpdate={(up) => onSetLabor(labor.map((i) => (i.id === up.id ? up : i)))}
                                    onDelete={onDeleteLabor}
                                />
                            ))}
                        </div>
                        {labor.length > 0 && (
                            <div className="flex justify-end items-center p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-[0.2em]">Total Mão de Obra</span>
                                    <span className="text-xl font-black text-amber-700 dark:text-amber-400">R$ {totalLabor.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {resourceTab === 'indireto' && (
                    <div>
                        <AddIndirectForm planId={planId} onAdd={(i) => onSetIndirects([...indirects, i])} />
                        {indirects.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"
                                        checked={selectedIndirects.length === indirects.length && indirects.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIndirects(indirects.map((i) => i.id));
                                            else setSelectedIndirects([]);
                                        }}
                                    />
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        {selectedIndirects.length} selecionado(s)
                                    </span>
                                </div>
                                {selectedIndirects.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Excluir ${selectedIndirects.length} itens?`)) {
                                                onSetIndirects(indirects.filter((i) => !selectedIndirects.includes(i.id)));
                                                setSelectedIndirects([]);
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
                            {indirects.map((i, index) => (
                                <EditableIndirectRow
                                    key={i.id}
                                    indirect={i}
                                    index={index}
                                    totalItems={indirects.length}
                                    isDragged={indDnD.draggedIndex === index}
                                    isSelected={selectedIndirects.includes(i.id)}
                                    onSelect={handleSelectIndirect}
                                    onDragStart={indDnD.handleDragStart}
                                    onDragOver={(e, idx) => indDnD.handleDragOver(e, idx, indirects, onSetIndirects)}
                                    onDragEnd={indDnD.handleDragEnd}
                                    onMove={(idx, dir) => indDnD.moveItem(indirects, onSetIndirects, idx, dir)}
                                    onUpdate={(up) => onSetIndirects(indirects.map((item) => (item.id === up.id ? up : item)))}
                                    onDelete={onDeleteIndirect}
                                />
                            ))}
                        </div>
                        {indirects.length > 0 && (
                            <div className="flex justify-end items-center p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500/60 dark:text-slate-400/60 uppercase tracking-[0.2em]">Total Indiretos</span>
                                    <span className="text-xl font-black text-slate-700 dark:text-slate-200">R$ {totalIndirect.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {resourceTab === 'impostos' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Percent size={14} className="text-blue-500" /> Impostos e BDI Padronizados
                                </h4>
                                <button
                                    onClick={loadDefaultTaxes}
                                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"
                                >
                                    Carregar Padrão (ISS/PIS/COF/INS)
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[
                                    { name: 'BDI', label: 'BDI (%)', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                    { name: 'ISS', label: 'ISS (%)', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                                    { name: 'PIS', label: 'PIS (%)', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                                    { name: 'COFINS', label: 'COFINS (%)', color: 'bg-slate-50 text-slate-700 border-slate-100' },
                                    { name: 'INSS', label: 'INSS (%)', color: 'bg-orange-50 text-orange-700 border-orange-100' },
                                ].map((tax) => (
                                    <div key={tax.name} className={`p-3 rounded-lg border ${tax.color}`}>
                                        <label className="block text-[10px] font-bold uppercase mb-1 opacity-70">{tax.label}</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-white/50 border border-black/5 rounded p-1 text-sm font-bold outline-none"
                                            value={taxes.find((t) => t.name === tax.name)?.rate || ''}
                                            placeholder="0.00"
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newTaxes = [...taxes];
                                                const idx = newTaxes.findIndex((t) => t.name === tax.name);
                                                if (idx !== -1) {
                                                    newTaxes[idx] = { ...newTaxes[idx], rate: val, value: 0 };
                                                } else {
                                                    newTaxes.push({
                                                        id: db.generateId('TAX'),
                                                        plan_id: planId,
                                                        name: tax.name,
                                                        rate: val,
                                                        value: 0,
                                                    });
                                                }
                                                onSetTaxes(newTaxes);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-full mt-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detalhamento Customizado</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {taxes.filter((t) => t.rate > 0 || t.value > 0).map((t) => (
                                    <div key={t.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div>
                                            <span className="font-black text-xs text-slate-700 dark:text-slate-200">{t.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 ml-2">
                                                {t.rate > 0 ? `${t.rate}%` : `R$ ${t.value.toFixed(2)}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-xs text-blue-600">
                                                R$ {(t.rate > 0 ? (t.name === 'BDI' ? totalDirect : totalGeneral) * (t.rate / 100) : t.value).toFixed(2)}
                                            </span>
                                            <button onClick={() => onDeleteTax(t.id)} className="text-slate-300 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
