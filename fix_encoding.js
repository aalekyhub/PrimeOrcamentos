const fs = require('fs');
const path = require('path');

const replacements = {
    '├º': 'ç',
    '├Á': 'õ',
    '├ú': 'ã',
    '├â': 'Ã',
    '├ü': 'Á',
    '├è': 'Ê',
    '├ç': 'Ç',
    '├│': 'ó',
    '├í': 'á',
    '├®': 'é',
    '├¡': 'í',
    '├¬': 'ê',
    '├┤': 'ô',
    '├ì': 'Í',
    '├╝': 'ü',
    'Ô£ô': '✓',
    'PÃ GINA': 'PÁGINA',
    'PÃGINA': 'PÁGINA',
    'PÃ G': 'PÁG',
    'nÃ£o': 'não',
    'serviÃ§os': 'serviços',
    'orÃ§amento': 'orçamento',
    'gestÃ£o': 'gestão',
    'emissÃ£o': 'emissão',
    'descriÃ§Ã£o': 'descrição'
};

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [broken, correct] of Object.entries(replacements)) {
        content = content.split(broken).join(correct);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
        return true;
    }
    return false;
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            fixFile(fullPath);
        }
    });
}

const componentsDir = path.join(__dirname, 'components');
console.log('Starting encoding fix...');
walk(componentsDir);
console.log('Finished!');
