import os

replacements = {
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
}

def fix_file(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return False
    
    original = content
    for broken, correct in replacements.items():
        content = content.replace(broken, correct)
    
    if content != original:
        try:
            with open(path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error writing {path}: {e}")
            return False
    return False

targets = ['components', 'hooks', 'services']
fixed_count = 0

for target in targets:
    if os.path.exists(target):
        for root, dirs, files in os.walk(target):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.html', '.css')):
                    path = os.path.join(root, file)
                    if fix_file(path):
                        print(f"Fixed: {path}")
                        fixed_count += 1

# Root files
for file in os.listdir('.'):
    if file.endswith(('.tsx', '.ts', '.html', '.css')):
        if fix_file(file):
            print(f"Fixed: {file}")
            fixed_count += 1

print(f"Finished! Fixed {fixed_count} files.")
