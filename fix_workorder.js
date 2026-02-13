const fs = require('fs');
const filePath = 'components/WorkOrderManager.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const original = content;
// Try common manglings of PÁGINA
content = content.replace(/PÃ\s+GINA/g, 'PÁGINA');
content = content.replace(/PÃGINA/g, 'PÁGINA');
content = content.replace(/PÃ\u0081GINA/g, 'PÁGINA');

if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed WorkOrderManager.tsx');
} else {
    console.log('No changes needed or matching failed');
}
