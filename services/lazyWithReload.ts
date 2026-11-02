import { lazy, ComponentType } from 'react';

const RELOAD_FLAG = 'prime_chunk_reload';

// React.lazy com proteção para deploy novo: se o navegador ainda tem a versão
// antiga aberta, o arquivo do módulo pode não existir mais no servidor.
// Nesse caso recarrega a página uma única vez para pegar a versão atual.
export const lazyWithReload = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      const module = await loader();
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignora */ }
      return module;
    } catch (error) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          return new Promise<never>(() => {});
        }
      } catch { /* sem sessionStorage: segue para o erro normal */ }
      throw error;
    }
  });
