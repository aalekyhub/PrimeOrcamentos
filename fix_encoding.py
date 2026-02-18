
import os

replacements = [
    # Ç and combinations
    ('çà', 'çã'),
    ('çào', 'ção'),
    ('ção', 'ção'),
    ('ÇAO', 'ÇÃO'),
    ('ç', 'ç'),
    ('à§', 'ç'),
    ('À§', 'Ç'),
    
    # ã
    ('à', 'ã'),
    ('à', 'ã'),
    ('à', 'ã'),
    ('à', 'ã'),
    ('à', 'ã'),
    
    # é / É
    ('à‰', 'É'),
    ('t+cnicos', 'técnicos'),
    ('T+tulo', 'Título'),
    ('Pr+via', 'Prévia'),
    ('é', 'é'),
    ('à©', 'é'),
    
    # í
    ('í', 'í'),
    ('à', 'í'),
    
    # ó / Ô
    ('à', 'ó'),
    ('ô', 'ô'),
    ('à´', 'ô'),
    
    # Bullet
    ('â€¢', '•'),
    
    # All Caps Patterns
    ('ELABORAO', 'ELABORAÇÃO'),
    ('CONFIGURAO', 'CONFIGURAÇÃO'),
    ('ORAMENTO', 'ORÇAMENTO'),
    ('T+TULO', 'TÍTULO'),
    ('PRESTAO', 'PRESTAÇÃO'),
    ('CONDIES', 'CONDIÇÕES'),
    ('EMISSàƒO', 'EMISSÃO'),
    ('EMISSão', 'EMISSÃO'),
    ('ATENà‡àƒO', 'ATENÇÃO'),
    ('Sà‰RIE', 'SÉRIE'),
    
    # Common words
    ('Elaborao', 'Elaboração'),
    ('Configurao', 'Configuração'),
    ('servio', 'serviço'),
    ('Catlogo', 'Catálogo'),
    ('previdenciria', 'previdenciária'),
    ('condies', 'condições'),
    ('In+cio', 'Início'),
    ('Inºcio', 'Início'),
    ('autorizAções', 'autorizações'),
    ('n+mero', 'número'),
    ('nºmero', 'número'),
    ('funcion+rios', 'funcionários'),
    ('hiptese', 'hipótese'),
    ('ces+o', 'cessão'),
    ('loca+o', 'locação'),
    ('pr+prios', 'próprios'),
    ('mtodos', 'métodos'),
    ('subordinao', 'subordinação'),
    ('disponibilizao', 'disponibilização'),
    ('Execuçào', 'Execução'),
    ('Gestào', 'Gestão'),
    ('Manutençào', 'Manutenção'),
    ('Descriçào', 'Descrição'),
    ('açào', 'ação'),
    ('açà', 'ação'),
    ('açao', 'ação'),
]

def fix_file(filepath):
    print(f"Fixing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        print(f"  Error reading {filepath}: {e}")
        return

    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Fixed!")
    else:
        print(f"  No changes needed.")

files_to_fix = [
    'components/BudgetManager.tsx',
    'components/WorkOrderManager.tsx',
    'components/ServiceOrderManager.tsx',
    'components/PlanningManager.tsx',
    'App.tsx',
    'components/UnifiedWorksManager.tsx'
]

if __name__ == "__main__":
    base_path = r'c:\Users\Aleky\clone\PrimeOrcamentos'
    for f in files_to_fix:
        full_path = os.path.join(base_path, f)
        if os.path.exists(full_path):
            fix_file(full_path)
        else:
            print(f"File not found: {full_path}")
