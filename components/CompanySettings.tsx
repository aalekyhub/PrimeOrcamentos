
import React, { useRef, useState } from 'react';
import {
  Building2, Upload, Camera, Mail, Phone, MapPin, Save, Trash2,
  Type, CheckCircle2, Maximize2, ShieldCheck, Plus, Ruler, X,
  MessageCircle, Download, Database, RefreshCw, AlertTriangle
} from 'lucide-react';
import { CompanyProfile, MeasurementUnit, UserAccount } from '../types';
import { db } from '../services/db';
import { getTodayIsoDate } from '../services/dateService';
import { useNotify } from './ToastProvider';

interface Props {
  company: CompanyProfile;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  currentUser: UserAccount;
}

const CompanySettings: React.FC<Props> = ({ company, setCompany, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { notify } = useNotify();

  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [newUnitValue, setNewUnitValue] = useState('');
  const [loadingApi, setLoadingApi] = useState(false);

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
      link.download = `backup_primeservicos_${getTodayIsoDate()}.json`;
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

  const lookupCNPJ = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setLoadingApi(true);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (resp.ok) {
        const data = await resp.json();
        setCompany(prev => ({
          ...prev,
          name: data.razao_social,
          cnpj: cnpj,
          address: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}`,
        }));
        notify("Dados da empresa importados!");
        setLoadingApi(false);
        return;
      }
    } catch (e) {
      console.error("BrasilAPI fallback triggered", e);
    }

    // Fallback: CNPJ.ws (Public API)
    try {
      const resp = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
      if (resp.ok) {
        const data = await resp.json();
        const est = data.estabelecimento;
        setCompany(prev => ({
          ...prev,
          name: data.razao_social,
          cnpj: cnpj,
          address: `${est.logradouro}, ${est.numero} - ${est.bairro}, ${est.cidade.nome} - ${est.estado.sigla}`,
        }));
        notify("Dados da empresa importados via CNPJ.ws");
        setLoadingApi(false);
        return;
      }
    } catch (e) {
      console.error("CNPJ.ws failed", e);
    }

    notify("Não foi possível buscar os dados da empresa automaticamente.", "warning");
    setLoadingApi(false);
  };

  const handleSave = async (data: CompanyProfile) => {
    const result = await db.save('serviflow_company', data);

    if (!result?.success) {
      throw new Error("Erro ao sincronizar com a nuvem");
    }
    return result;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações da Empresa</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Personalize os dados e garanta a segurança das suas informações.</p>
        </div>

        {isAdmin ? (
          <button onClick={() => handleSave(company).then(() => notify("Configurações salvas com sucesso!"))} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95">
            <Save className="w-5 h-5" /> Salvar Configurações
          </button>
        ) : (
          <div className="bg-rose-50 text-rose-500 px-6 py-3 rounded-2xl font-black text-xs border border-rose-200 flex items-center gap-2 uppercase">
            <ShieldCheck className="w-5 h-5" /> Somente Consulta
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identidade Visual</h4>
            <div className="relative group mx-auto w-full h-40 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
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
                  <span className="text-[10px] font-bold uppercase">{isAdmin ? 'Carregar Logo' : 'Logo da Empresa'}</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={!isAdmin} />
            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 text-left space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Tamanho Logo</span><span>{company.logoSize}px</span></div>
                <input type="range" min="40" max="200" step="5" className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50" value={company.logoSize} onChange={e => setCompany({ ...company, logoSize: Number(e.target.value) })} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Tamanho Fonte</span><span>{company.nameFontSize}px</span></div>
                <input type="range" min="16" max="48" step="1" className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50" value={company.nameFontSize} onChange={e => setCompany({ ...company, nameFontSize: Number(e.target.value) })} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Tamanho Fonte (Descrição)</span><span>{company.descriptionFontSize || 10}px</span></div>
                <input type="range" min="8" max="16" step="1" className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" value={company.descriptionFontSize || 10} onChange={e => setCompany({ ...company, descriptionFontSize: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase"><span>Tamanho Fonte (Itens)</span><span>{company.itemsFontSize || 10}px</span></div>
                <input type="range" min="8" max="14" step="1" className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" value={company.itemsFontSize || 10} onChange={e => setCompany({ ...company, itemsFontSize: Number(e.target.value) })} />
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
              {isAdmin && (
                <>
                  <button onClick={() => importInputRef.current?.click()} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                    <RefreshCw className="w-4 h-4" /> Importar Backup
                  </button>
                  <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportData} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Nome da Empresa</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-white disabled:opacity-70" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} disabled={!isAdmin} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">CNPJ</label>
                <div className="relative">
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100 disabled:opacity-70" value={company.cnpj} onChange={e => {
                    let val = e.target.value;
                    val = val.replace(/\D/g, '');
                    if (val.length > 14) val = val.slice(0, 14);
                    // Máscara CNPJ
                    val = val.replace(/^(\d{2})(\d)/, '$1.$2');
                    val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    val = val.replace(/(\d{4})(\d)/, '$1-$2');
                    
                    setCompany({ ...company, cnpj: val });
                    if (val.replace(/\D/g, '').length === 14) lookupCNPJ(val);
                  }} disabled={!isAdmin} />
                  {loadingApi && (
                    <div className="absolute right-3 top-3">
                      <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Slogan</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100 disabled:opacity-70" value={company.tagline} onChange={e => setCompany({ ...company, tagline: e.target.value })} disabled={!isAdmin} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">E-mail</label>
                <input type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100 disabled:opacity-70" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} disabled={!isAdmin} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">WhatsApp</label>
                <div className="relative">
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100 disabled:opacity-70" value={company.phone} onChange={e => setCompany({ ...company, phone: formatPhone(e.target.value) })} disabled={!isAdmin} />
                  <button onClick={openWhatsApp} className="absolute right-3 top-3 text-emerald-500"><MessageCircle className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Validade da Proposta (Dias)</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-white disabled:opacity-70" value={company.defaultProposalValidity || 15} onChange={e => setCompany({ ...company, defaultProposalValidity: Number(e.target.value) })} disabled={!isAdmin} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Margem Superior PDF (mm)</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-white disabled:opacity-70" value={company.printMarginTop || 15} onChange={e => setCompany({ ...company, printMarginTop: Number(e.target.value) })} disabled={!isAdmin} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Margem Inferior PDF (mm)</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-white disabled:opacity-70" value={company.printMarginBottom || 15} onChange={e => setCompany({ ...company, printMarginBottom: Number(e.target.value) })} disabled={!isAdmin} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Endereço</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100 disabled:opacity-70" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} disabled={!isAdmin} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Lembre-se de salvar suas alterações
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
