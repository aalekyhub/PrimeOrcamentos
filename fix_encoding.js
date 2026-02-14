import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const replacements = [
    // High-priority UI terms
    { pattern: /Or\uFFFD+amentos/gi, correct: 'Orçamentos' },
    { pattern: /SOLU\uFFFD+ES/gi, correct: 'SOLUÇÕES' },
    { pattern: /GEST\uFFFD+O/gi, correct: 'GESTÃO' },
    { pattern: /MANUTEN\uFFFD+O/gi, correct: 'MANUTENÇÃO' },

    // Contract Clauses and Legal terms
    { pattern: /CL\uFFFD+USULA/gi, correct: 'CLÁUSULA' },
    { pattern: /Cl\uFFFD+usula/gi, correct: 'Cláusula' },
    { pattern: /execu\uFFFD+o/gi, correct: 'execução' },
    { pattern: /contribui\uFFFD+es/gi, correct: 'contribuições' },
    { pattern: /obriga\uFFFD+es/gi, correct: 'obrigações' },
    { pattern: /legisla\uFFFD+o/gi, correct: 'legislação' },
    { pattern: /previdenci\uFFFD+rios/gi, correct: 'previdenciários' },
    { pattern: /securit\uFFFD+rios/gi, correct: 'securitários' },
    { pattern: /Instru\uFFFD+o/gi, correct: 'Instrução' },
    { pattern: /n\uFFFD+o/gi, correct: 'não' },
    { pattern: /n\uFFFD/gi, correct: 'nº' },
    { pattern: /\uFFFDnica/gi, correct: 'única' },
    { pattern: /respons\uFFFD+vel/gi, correct: 'responsável' },
    { pattern: /in\uFFFD+cio/gi, correct: 'início' },
    { pattern: /T\uFFFD+CNICA/gi, correct: 'TÉCNICA' },
    { pattern: /T\uFFFD+cnica/gi, correct: 'Técnica' },
    { pattern: /aplic\uFFFD+vel/gi, correct: 'aplicável' },
    { pattern: /providenciar\uFFFD/gi, correct: 'providenciará' },
    { pattern: /RESCIS\uFFFD+O/gi, correct: 'RECISÃO' },
    { pattern: /ensejar\uFFFD/gi, correct: 'ensejará' },
    { pattern: /preju\uFFFD+zo/gi, correct: 'prejuízo' },
    { pattern: /S\uFFFD+o/gi, correct: 'São' },
    { pattern: /controv\uFFFD+rsia/gi, correct: 'controvérsia' },
    { pattern: /impress\uFFFD+o/gi, correct: 'impressão' },

    // Technical/General terms
    { pattern: /constru\uFFFD+o/gi, correct: 'construção' },
    { pattern: /constru\uFFFD+es/gi, correct: 'construções' },
    { pattern: /rela\uFFFD+o/gi, correct: 'relação' },
    { pattern: /Relat\uFFFD+rio/gi, correct: 'Relatório' },
    { pattern: /RELAT\uFFFD+RIO/gi, correct: 'RELATÓRIO' },
    { pattern: /or\uFFFD+ados/gi, correct: 'orçados' },
    { pattern: /n\uFFFD+mero/gi, correct: 'número' },
    { pattern: /funcion\uFFFD+rios/gi, correct: 'funcionários' },
    { pattern: /m\uFFFD+o/gi, correct: 'mão' },
    { pattern: /4\uFFFD/g, correct: '4ª' }, // specific ordinal
    { pattern: /5\uFFFD/g, correct: '5ª' },
    { pattern: /6\uFFFD/g, correct: '6ª' },
    { pattern: /7\uFFFD/g, correct: '7ª' },
    { pattern: /8\uFFFD/g, correct: '8ª' },
    { pattern: /9\uFFFD/g, correct: '9ª' },
    { pattern: /10\uFFFD/g, correct: '10ª' },

    // Previous mappings for safety
    { pattern: /servi\uFFFD+os/gi, correct: 'serviços' },
    { pattern: /descri\uFFFD+o/gi, correct: 'descrição' },
    { pattern: /otimiza\uFFFD+o/gi, correct: 'otimização' },
    { pattern: /emiss\uFFFD+o/gi, correct: 'emissão' },
    { pattern: /proxima\uFFFD+o/gi, correct: 'proximação' },
    { pattern: /situa\uFFFD+o/gi, correct: 'situação' },
    { pattern: /aten\uFFFD+o/gi, correct: 'atenção' },
    { pattern: /corre\uFFFD+o/gi, correct: 'correção' },
    { pattern: /T\uFFFD+tulo/gi, correct: 'Título' },
    { pattern: /Or\uFFFD+amento/gi, correct: 'Orçamento' },
    { pattern: /A\uFFFD+es/gi, correct: 'Ações' },
    { pattern: /CONTRATA\uFFFD+O/gi, correct: 'CONTRATAÇÃO' },
    { pattern: /UTILIZA\uFFFD+O/gi, correct: 'UTILIZAÇÃO' },
    { pattern: /EXECU\uFFFD+O/gi, correct: 'EXECUÇÃO' },
    { pattern: /INFORMA\uFFFD+ES/gi, correct: 'INFORMAÇÕES' },
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
