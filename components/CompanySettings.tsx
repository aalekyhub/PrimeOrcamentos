
import React, { useRef, useState } from 'react';
import {
  Building2, Upload, Camera, Mail, Phone, MapPin, Save, Trash2,
  Type, CheckCircle2, Maximize2, ShieldCheck, Plus, Ruler, X,
  MessageCircle, Download, Database, RefreshCw, AlertTriangle
} from 'lucide-react';
import { CompanyProfile, MeasurementUnit } from '../../types';
import { useNotify } from './ToastProvider';

interface Props {
  company: CompanyProfile;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>;
}

const CompanySettings: React.FC<Props> = ({ company, setCompany }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { notify } = useNotify();

  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [newUnitValue, setNewUnitValue] = useState('');

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let res = "";
    if (digits.length > 0) {
      res = "(" + digits.substring(0, 2);
      if (digits.length > 2) res += ") " + digits.substring(2, 7);
      if (digits.length > 7) res += " " + digits.substring(7, 11);
    }
    return res;
  };

  const openWhatsApp = () => {
    const digits = company.phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      window.open(`https://web.whatsapp.com/send?phone=55${digits}`, '_blank');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        orders: JSON.parse(localStorage.getItem('serviflow_orders') || '[]'),
        customers: JSON.parse(localStorage.getItem('serviflow_customers') || '[]'),
        transactions: JSON.parse(localStorage.getItem('serviflow_transactions') || '[]'),
        catalog: JSON.parse(localStorage.getItem('serviflow_catalog') || '[]'),
        company: JSON.parse(localStorage.getItem('serviflow_company') || '{}'),
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_primeservicos_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      notify("Backup gerado com sucesso!");
    } catch (err) {
      notify("Erro ao exportar dados", "error");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Isso irá SOBRESCREVER todos os dados atuais do sistema pelos dados do arquivo. Deseja continuar?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.orders) localStorage.setItem('serviflow_orders', JSON.stringify(data.orders));
        if (data.customers) localStorage.setItem('serviflow_customers', JSON.stringify(data.customers));
        if (data.transactions) localStorage.setItem('serviflow_transactions', JSON.stringify(data.transactions));
        if (data.catalog) localStorage.setItem('serviflow_catalog', JSON.stringify(data.catalog));
        if (data.company) localStorage.setItem('serviflow_company', JSON.stringify(data.company));

        notify("Dados restaurados! Reiniciando...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        notify("Arquivo de backup inválido", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleAddUnit = () => {
    if (!newUnitLabel || !newUnitValue) return;
    if (company.customUnits.some(u => u.value.toLowerCase() === newUnitValue.toLowerCase())) {
      notify("Esta abreviação já existe.", "error");
      return;
    }
    setCompany(prev => ({ ...prev, customUnits: [...prev.customUnits, { label: newUnitLabel, value: newUnitValue.toLowerCase() }] }));
    setNewUnitLabel(''); setNewUnitValue('');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      notify("Configurações salvas!");
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Configurações da Empresa</h2>
          <p className="text-slate-500 text-sm">Personalize os dados e garanta a segurança das suas informações.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade Visual</h4>
            <div className="relative group mx-auto w-full h-40 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              {company.logo ? (
                <div className="relative flex items-center justify-center p-4 w-full h-full">
                  <img src={company.logo} alt="Logo" style={{ height: `${company.logoSize}px` }} className="max-w-full object-contain" />
                  <button onClick={() => setCompany(prev => ({ ...prev, logo: undefined }))} className="absolute -top-3 -right-3 bg-rose-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors">
                  <Upload className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase">Carregar Logo</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
            <div className="pt-4 border-t border-slate-50 text-left space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Tamanho Logo</span><span>{company.logoSize}px</span></div>
                <input type="range" min="40" max="200" step="5" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" value={company.logoSize} onChange={e => setCompany({ ...company, logoSize: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Tamanho Fonte</span><span>{company.nameFontSize}px</span></div>
                <input type="range" min="16" max="48" step="1" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" value={company.nameFontSize} onChange={e => setCompany({ ...company, nameFontSize: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl space-y-6">
            <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
              <Database className="w-4 h-4" /> Segurança de Dados
            </h4>
            <div className="space-y-3">
              <p className="text-[10px] text-indigo-200 leading-relaxed font-medium">Seus dados estão salvos localmente. Recomendamos exportar um backup semanalmente.</p>
              <button onClick={handleExportData} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <Download className="w-4 h-4" /> Exportar Backup (JSON)
              </button>
              <button onClick={() => importInputRef.current?.click()} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <RefreshCw className="w-4 h-4" /> Importar Backup
              </button>
              <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportData} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Nome da Empresa</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">CNPJ</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={company.cnpj} onChange={e => setCompany({ ...company, cnpj: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Slogan</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={company.tagline} onChange={e => setCompany({ ...company, tagline: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">E-mail</label>
                <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">WhatsApp</label>
                <div className="relative">
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={company.phone} onChange={e => setCompany({ ...company, phone: formatPhone(e.target.value) })} />
                  <button onClick={openWhatsApp} className="absolute right-3 top-3 text-emerald-500"><MessageCircle className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Endereço</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={handleSave} disabled={saveStatus !== 'idle'} className={`px-10 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl ${saveStatus === 'saved' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {saveStatus === 'idle' && <><Save className="w-5 h-5" /> Salvar Alterações</>}
                {saveStatus === 'saving' && <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Salvando...</>}
                {saveStatus === 'saved' && <><CheckCircle2 className="w-5 h-5" /> Dados Salvos!</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
