
import fs from 'fs';
import path from 'path';

const filesToFix = [
    "components/BudgetManager.tsx",
    "components/WorkOrderManager.tsx",
    "components/ServiceOrderManager.tsx",
    "components/PlanningManager.tsx",
    "App.tsx",
    "components/UnifiedWorksManager.tsx",
    "components/FinancialControl.tsx",
    "components/WorksManager.tsx",
    "hooks/usePrintOS.ts",
    "components/SinapiImporter.tsx",
    "components/DataCleanup.tsx"
];

const replacements = [
    { old: "\u00C3\u00A1", new: "á" },
    { old: "\u00C3\u00A7", new: "ç" },
    { old: "\u00C3\u00A3", new: "ã" },
    { old: "\u00C3\u00A9", new: "é" },
    { old: "\u00C3\u00AA", new: "ê" },
    { old: "\u00C3\u00BA", new: "ú" },
    { old: "\u00C3\u00B5", new: "õ" },
    { old: "\u00C3\u00AD", new: "í" },
    { old: "\u00C3\u00B3", new: "ó" },
    { old: "\u00C3\u00B4", new: "ô" },
    { old: "\u00C3\u0080", new: "À" },
    { old: "\u00C3\u0081", new: "Á" },
    { old: "\u00C3\u0087", new: "Ç" },
    { old: "\u00C3\u0083", new: "Ã" },
    { old: "\u00C3\u0093", new: "Ó" },
    { old: "\u00C3\u0092", new: "Ò" },
    { old: "\u00C3\u0095", new: "Õ" },

    { old: "t+\uFFFDcnicos", new: "técnicos" },
    { old: "Pr+\uFFFDvia", new: "Prévia" },
    { old: "T+\uFFFDtulo", new: "Título" },
    { old: "T+\uFFFDTULO", new: "TÍTULO" },
    { old: "S+\uFFFDRIE", new: "SÉRIE" },
    { old: "In+\uFFFDcio", new: "Início" },
    { old: "servi\uFFFDo", new: "serviço" },
    { old: "Elabora\uFFFDo", new: "Elaboração" },
    { old: "Configura\uFFFDo", new: "Configuração" },
    { old: "Ora\uFFFDRmento", new: "Orçamento" },
    { old: "Ora\uFFFDMmento", new: "Orçamento" },
    { old: "Presta\uFFFDo", new: "Prestação" },
    { old: "aç\uFFFDo", new: "ação" },
    { old: "Situa\uFFFDo", new: "Situação" },

    { old: "Prestao", new: "Prestação" },
    { old: "EMISSão", new: "EMISSÃO" },
    { old: "previdenciria", new: "previdenciária" },
    { old: "condies", new: "condições" },
    { old: "ELABORAO", new: "ELABORAÇÃO" },
    { old: "CONFIGURAO", new: "CONFIGURAÇÃO" },
    { old: "ORAMENTO", new: "ORÇAMENTO" },
    { old: "ATEN\u00E0\u2021\u00E0\u0192O", new: "ATENÇÃO" },
    { old: "açao", new: "ação" },
    { old: "EMISS\u00E0\u0192O", new: "EMISSÃO" },
    { old: "S\u00E0\u2030RIE", new: "SÉRIE" }
];

const workspaceRoot = process.cwd();

filesToFix.forEach(file => {
    const filePath = path.resolve(workspaceRoot, file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    console.log(`Fixing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    replacements.forEach(r => {
        const escaped = r.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'g');
        content = content.replace(re, r.new);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Fixed!`);
    } else {
        console.log(`  No changes.`);
    }
});
console.log('Done!');
