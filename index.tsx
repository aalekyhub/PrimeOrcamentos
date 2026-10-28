
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Campos numéricos mudam de valor com a rodinha do mouse quando estão em foco
// (ex: 550,00 virava 549,99 ao rolar a lista de itens com o cursor em cima).
// Tira o foco do campo antes da rolagem para a rodinha só rolar a tela.
document.addEventListener(
  'wheel',
  (e) => {
    const el = e.target;
    if (el instanceof HTMLInputElement && el.type === 'number' && document.activeElement === el) {
      el.blur();
    }
  },
  { capture: true, passive: true }
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
