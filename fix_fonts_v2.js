const fs = require('fs');
const filePath = 'c:/Users/Aleky/clone/PrimeOrcamentos/components/BudgetManager.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Ajustar labels de 11px para 9px
content = content.replace(/font-size: 11px/g, 'font-size: 9px');
// Ajustar valores de 12px para 11px
content = content.replace(/font-size: 12px/g, 'font-size: 11px');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fim do ajuste de fontes.');
