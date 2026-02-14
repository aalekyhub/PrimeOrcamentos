import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const replacements = [
    { pattern: /Or\uFFFD+amentos/g, correct: 'Orçamentos' },
    { pattern: /SOLU\uFFFD+ES/g, correct: 'SOLUÇÕES' },
    { pattern: /GEST\uFFFD+O/g, correct: 'GESTÃO' },
    { pattern: /Gest\uFFFD+o/g, correct: 'Gestão' },
    { pattern: /MANUTEN\uFFFD+O/g, correct: 'MANUTENÇÃO' },
    { pattern: /servi\uFFFD+os/g, correct: 'serviços' },
    { pattern: /Servi\uFFFD+os/g, correct: 'Serviços' },
    { pattern: /Servi\uFFFD+o/g, correct: 'Serviço' },
    { pattern: /descri\uFFFD+o/g, correct: 'descrição' },
    { pattern: /Descri\uFFFD+o/g, correct: 'Descrição' },
    { pattern: /DESCRI\uFFFD+O/g, correct: 'DESCRIÇÃO' },
    { pattern: /Configura\uFFFD+es/g, correct: 'Configurações' },
    { pattern: /Previs\uFFFD+o/g, correct: 'Previsão' },
    { pattern: /Condi\uFFFD+o/g, correct: 'Condição' },
    { pattern: /Padr\uFFFD+o/g, correct: 'Padrão' },
    { pattern: /Opera\uFFFD+o/g, correct: 'Operação' },
    { pattern: /Situa\uFFFD+o/g, correct: 'Situação' },
    { pattern: /Observa\uFFFD+es/g, correct: 'Observações' },
    { pattern: /A\uFFFD+es/g, correct: 'Ações' },
    { pattern: /A\uFFFD+ES/g, correct: 'AÇÕES' },
    { pattern: /P\uFFFD+g\./g, correct: 'Pág.' },
    { pattern: /otimiza\uFFFD+o/g, correct: 'otimização' },
    { pattern: /constru\uFFFD+es/g, correct: 'construções' },
    { pattern: /emiss\uFFFD+o/g, correct: 'emissão' },
    { pattern: /Emiss\uFFFD+o/g, correct: 'Emissão' },
    { pattern: /Aponsentadoria/g, correct: 'Aposentadoria' },
    { pattern: /Execu\uFFFD+o/g, correct: 'Execução' },
    { pattern: /Produ\uFFFD+o/g, correct: 'Produção' },
    { pattern: /atua\uFFFD+es/g, correct: 'atuações' },
    { pattern: /institui\uFFFD+o/g, correct: 'instituição' },
    { pattern: /rela\uFFFD+o/g, correct: 'relação' },
    { pattern: /anula\uFFFD+o/g, correct: 'anulação' },
    { pattern: /utiliza\uFFFD+o/g, correct: 'utilização' },
    { pattern: /aprecia\uFFFD+o/g, correct: 'apreciação' },
    { pattern: /reten\uFFFD+o/g, correct: 'retenção' },
    { pattern: /isen\uFFFD+o/g, correct: 'isenção' },
    { pattern: /compensat\uFFFD+ria/g, correct: 'compensatória' },
    { pattern: /contrata\uFFFD+o/g, correct: 'contratação' },
    { pattern: /terceiriza\uFFFD+o/g, correct: 'terceirização' },
    { pattern: /especifica\uFFFD+es/g, correct: 'especificações' },
    { pattern: /comunica\uFFFD+o/g, correct: 'comunicação' },
    { pattern: /autoriza\uFFFD+o/g, correct: 'autorização' },
    { pattern: /declara\uFFFD+o/g, correct: 'declaração' },
    { pattern: /finaliza\uFFFD+o/g, correct: 'finalização' },
    { pattern: /corre\uFFFD+o/g, correct: 'correção' },
    { pattern: /atualiza\uFFFD+o/g, correct: 'atualização' },
];

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const item of replacements) {
        content = content.replace(item.pattern, item.correct);
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
            if (!file.includes('node_modules')) walk(fullPath);
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

    const rootFiles = fs.readdirSync(__dirname);
    rootFiles.forEach(file => {
        if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.css')) {
            fixFile(path.join(__dirname, file));
        }
    });
}

console.log('Starting encoding fix (Robust ESM)...');
runFix();
console.log('Finished!');
