import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    'descriÃ§Ã£o': 'descrição',
    'SOLUES': 'SOLUÇÕES',
    'GESTO': 'GESTÃO',
    'EMISSO': 'EMISSÃO',
    'Oramentos': 'Orçamentos',
    'Oramento': 'Orçamento',
    'Servios': 'Serviços',
    'DescriÃ£o': 'Descrição',
    'Descrio': 'Descrição',
    'Configuraes': 'Configurações',
    'Aponsentadoria': 'Aposentadoria',
    'Endereo': 'Endereço',
    'Observaes': 'Observações',
    'Previso': 'Previsão',
    'Condio': 'Condição',
    'Padro': 'Padrão'
};

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [broken, correct] of Object.entries(replacements)) {
        content = content.split(broken).join(correct);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed characters in: ${filePath}`);
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
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.css')) {
            fixFile(fullPath);
        }
    });
}

function runFix() {
    const targets = [
        path.join(__dirname, 'components'),
        path.join(__dirname, 'hooks'),
        path.join(__dirname, 'services')
    ];

    targets.forEach(dir => {
        if (fs.existsSync(dir)) {
            walk(dir);
        }
    });

    // Check files in root
    const rootFiles = fs.readdirSync(__dirname);
    rootFiles.forEach(file => {
        if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.css')) {
            fixFile(path.join(__dirname, file));
        }
    });
}

console.log('Starting encoding fix (ESM)...');
runFix();
console.log('Finished!');
