import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destaca em vermelho. Se omitido, é detectado pelo texto (excluir, remover, limpar...). */
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  inputMode?: 'text' | 'decimal';
}

type ConfirmFn = (input: string | ConfirmOptions) => Promise<boolean>;
type PromptFn = (options: PromptOptions) => Promise<string | null>;

type PendingDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

interface DialogContextValue {
  confirm: ConfirmFn;
  prompt: PromptFn;
}

// Sem o provider (ex.: componente isolado), cai nas caixas nativas do navegador.
const DialogContext = createContext<DialogContextValue>({
  confirm: async (input) => window.confirm(typeof input === 'string' ? input : input.message),
  prompt: async (options) => window.prompt(options.title, options.defaultValue ?? ''),
});

export const useConfirm = () => useContext(DialogContext).confirm;
export const usePrompt = () => useContext(DialogContext).prompt;

const DANGER_PATTERN = /exclu|remov|apag|limp|sobrescrev|revert|permanente|encerrar/i;

const ConfirmDialog: React.FC<{
  options: ConfirmOptions;
  onResult: (value: boolean) => void;
}> = ({ options, onResult }) => {
  const danger = options.danger ?? DANGER_PATTERN.test(options.message);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResult(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResult]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => onResult(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${danger
              ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}
          >
            {danger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {options.title || (danger ? 'Confirmar ação' : 'Confirmação')}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {options.message}
            </p>
          </div>
        </div>

        <div className="mt-7 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => onResult(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {options.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onResult(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${danger
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {options.confirmLabel || (danger ? 'Sim, continuar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
};

const PromptDialog: React.FC<{
  options: PromptOptions;
  onResult: (value: string | null) => void;
}> = ({ options, onResult }) => {
  const [value, setValue] = useState(options.defaultValue ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResult(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResult]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => onResult(null)}
      role="dialog"
      aria-modal="true"
    >
      <form
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-7"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onResult(value);
        }}
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{options.title}</h3>
        {options.message && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{options.message}</p>
        )}
        <div className="mt-5 space-y-2">
          {options.label && (
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {options.label}
            </label>
          )}
          <input
            autoFocus
            type="text"
            inputMode={options.inputMode === 'decimal' ? 'decimal' : 'text'}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200"
            placeholder={options.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="mt-7 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => onResult(null)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {options.confirmLabel || 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fila: se duas janelas forem pedidas quase juntas, aparecem uma de cada vez.
  const [queue, setQueue] = useState<PendingDialog[]>([]);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const enqueue = useCallback((dialog: PendingDialog) => {
    setQueue((prev) => [...prev, dialog]);
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (input) =>
      new Promise<boolean>((resolve) => {
        const options = typeof input === 'string' ? { message: input } : input;
        enqueue({ kind: 'confirm', options, resolve });
      }),
    [enqueue]
  );

  const prompt = useCallback<PromptFn>(
    (options) =>
      new Promise<string | null>((resolve) => {
        enqueue({ kind: 'prompt', options, resolve });
      }),
    [enqueue]
  );

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  const current = queue[0];

  const finishConfirm = useCallback((result: boolean) => {
    const top = queueRef.current[0];
    if (top?.kind !== 'confirm') return;
    top.resolve(result);
    setQueue((prev) => prev.slice(1));
  }, []);

  const finishPrompt = useCallback((result: string | null) => {
    const top = queueRef.current[0];
    if (top?.kind !== 'prompt') return;
    top.resolve(result);
    setQueue((prev) => prev.slice(1));
  }, []);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {current?.kind === 'confirm' && (
        <ConfirmDialog key={queue.length} options={current.options} onResult={finishConfirm} />
      )}
      {current?.kind === 'prompt' && (
        <PromptDialog key={queue.length} options={current.options} onResult={finishPrompt} />
      )}
    </DialogContext.Provider>
  );
};
