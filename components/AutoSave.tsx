import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useGlobalAutoSave } from './AutoSaveContext';

interface AutoSaveProps<T> {
  data: T;
  onSave: (data: T) => Promise<any>;
  delay?: number;
}

export const AutoSave = <T,>({
  data,
  onSave,
  delay = 2000,
}: AutoSaveProps<T>) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { setGlobalStatus } = useGlobalAutoSave();

  const firstRender = useRef(true);
  const isMounted = useRef(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersion = useRef(0);

  useEffect(() => {
    return () => {
      isMounted.current = false;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (resetStatusTimer.current) {
        clearTimeout(resetStatusTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (resetStatusTimer.current) {
      clearTimeout(resetStatusTimer.current);
    }

    setStatus('idle');
    setGlobalStatus('idle');
    setError(null);

    const currentVersion = ++saveVersion.current;

    debounceTimer.current = setTimeout(async () => {
      if (!isMounted.current) return;

      setStatus('saving');
      setGlobalStatus('saving');
      setError(null);

      try {
        await onSave(data);

        // Só atualiza a UI se este for o save mais recente
        if (!isMounted.current || currentVersion !== saveVersion.current) return;

        setStatus('saved');
        setGlobalStatus('saved');

        resetStatusTimer.current = setTimeout(() => {
          if (!isMounted.current || currentVersion !== saveVersion.current) return;
          setStatus('idle');
          setGlobalStatus('idle');
        }, 3000);
      } catch (err: any) {
        if (!isMounted.current || currentVersion !== saveVersion.current) return;

        console.error('AutoSave Error:', err);
        setStatus('error');
        setGlobalStatus('error', err?.message || 'Erro ao sincronizar');
        setError(err?.message || 'Erro ao sincronizar');
      }
    }, delay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [data, onSave, delay]);

  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all animate-in fade-in duration-300">
      {status === 'saving' && (
        <div className="flex items-center gap-1.5 text-blue-500">
          <RefreshCw size={12} className="animate-spin" />
          <span>Sincronizando...</span>
        </div>
      )}

      {status === 'saved' && (
        <div className="flex items-center gap-1.5 text-emerald-500">
          <Check size={12} />
          <span>Alterações salvas</span>
        </div>
      )}

      {status === 'error' && (
        <div
          className="flex items-center gap-1.5 text-rose-500"
          title={error || ''}
        >
          <AlertCircle size={12} />
          <span>Erro ao salvar</span>
        </div>
      )}
    </div>
  );
};