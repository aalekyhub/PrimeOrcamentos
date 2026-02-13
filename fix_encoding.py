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
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error writing {path}: {e}")
            return False
    return False

components_dir = 'components'
fixed_count = 0
for root, dirs, files in os.walk(components_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            if fix_file(path):
                print(f"Fixed: {path}")
                fixed_count += 1

print(f"Finished! Fixed {fixed_count} files.")
