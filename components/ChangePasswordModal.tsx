import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../services/db';
import { useNotify } from './ToastProvider';

interface Props {
  email: string;
  onClose: () => void;
}

const MIN_LENGTH = 8;

const ChangePasswordModal: React.FC<Props> = ({ email, onClose }) => {
  const { notify } = useNotify();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('As duas senhas não são iguais.');
      return;
    }
    if (!supabase) {
      setError('Sem conexão com o servidor.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      console.error('[Senha] Falha ao alterar:', updateError);
      const code = (updateError as any).code as string | undefined;
      if (code === 'same_password') {
        setError('A nova senha precisa ser diferente da atual.');
      } else if (code === 'weak_password') {
        setError('Senha fraca. Use letras e números e evite sequências óbvias.');
      } else if (code === 'reauthentication_needed') {
        setError('Por segurança, o Supabase pede um login recente para trocar a senha. Saia e entre de novo e tente outra vez.');
      } else if (code === 'session_not_found' || (updateError as any).status === 401) {
        setError('Sua sessão expirou. Saia e entre de novo para trocar a senha.');
      } else {
        setError(`Não foi possível alterar a senha: ${updateError.message}`);
      }
      return;
    }

    notify('Senha alterada com sucesso!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Alterar minha senha</h3>
            <p className="text-xs text-slate-400 mt-1">{email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nova senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                autoComplete="new-password"
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200"
                placeholder={`Mínimo de ${MIN_LENGTH} caracteres`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-3.5 text-slate-300 hover:text-slate-500"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Repita a nova senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200"
                placeholder="Digite a mesma senha"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
