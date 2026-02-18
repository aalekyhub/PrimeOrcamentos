
$filesToFix = @(
    "components/BudgetManager.tsx",
    "components/WorkOrderManager.tsx",
    "components/ServiceOrderManager.tsx",
    "components/PlanningManager.tsx",
    "App.tsx",
    "components/UnifiedWorksManager.tsx",
    "components/FinancialControl.tsx",
    "components/WorksManager.tsx",
    "hooks/usePrintOS.ts",
    "components/SinapiImporter.tsx"
)

$repChar = [char]0xFFFD
$cA = [char]0x00C3

function Fix-FileEncoding ($filePath) {
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath"
        return
    }
    Write-Host "Fixing $filePath..."
    $content = [IO.File]::ReadAllText((Resolve-Path $filePath), [System.Text.Encoding]::UTF8)
    
    # Double UTF-8
    $content = $content.Replace(($cA + [char]0x00A1), "á")
    $content = $content.Replace(($cA + [char]0x00A7), "ç")
    $content = $content.Replace(($cA + [char]0x00A3), "ã")
    $content = $content.Replace(($cA + [char]0x00A9), "é")
    $content = $content.Replace(($cA + [char]0x00AA), "ê")
    $content = $content.Replace(($cA + [char]0x00BA), "º")
    $content = $content.Replace(($cA + [char]0x00B5), "õ")
    $content = $content.Replace(($cA + [char]0x00AD), "í")
    $content = $content.Replace(($cA + [char]0x00B3), "ó")
    $content = $content.Replace(($cA + [char]0x00B4), "ô")
    $content = $content.Replace(($cA + [char]0x0080), "À")
    $content = $content.Replace(($cA + [char]0x0081), "Á")
    $content = $content.Replace(($cA + [char]0x0087), "Ç")
    $content = $content.Replace(($cA + [char]0x0083), "Ã")
    $content = $content.Replace(($cA + [char]0x0093), "Ó")
    $content = $content.Replace(($cA + [char]0x0095), "Õ")
    
    # Replacement Char Patterns
    $content = $content.Replace(("t+" + $repChar + "cnicos"), "técnicos")
    $content = $content.Replace(("Pr+" + $repChar + "via"), "Prévia")
    $content = $content.Replace(("T+" + $repChar + "tulo"), "Título")
    $content = $content.Replace(("T+" + $repChar + "TULO"), "TÍTULO")
    $content = $content.Replace(("S+" + $repChar + "RIE"), "SÉRIE")
    $content = $content.Replace(("In+" + $repChar + "cio"), "Início")
    $content = $content.Replace(("servi" + $repChar + "o"), "serviço")
    $content = $content.Replace(("Elabora" + $repChar + "o"), "Elaboração")
    $content = $content.Replace(("Configura" + $repChar + "o"), "Configuração")
    $content = $content.Replace(("Ora" + $repChar + "mento"), "Orçamento")
    $content = $content.Replace(("Presta" + $repChar + "o"), "Prestação")
    $content = $content.Replace(("aç" + $repChar + "o"), "ação")

    # Literal strings
    $content = $content.Replace("Prestao", "Prestação")
    $content = $content.Replace("EMISSão", "EMISSÃO")
    $content = $content.Replace("previdenciria", "previdenciária")
    $content = $content.Replace("condies", "condições")
    $content = $content.Replace("ELABORAO", "ELABORAÇÃO")
    $content = $content.Replace("CONFIGURAO", "CONFIGURAÇÃO")
    $content = $content.Replace("ORAMENTO", "ORÇAMENTO")
    $content = $content.Replace("ATENà‡àƒO", "ATENÇÃO")
    $content = $content.Replace("EMISSàƒO", "EMISSÃO")
    $content = $content.Replace("açao", "ação")
    
    [IO.File]::WriteAllText((Resolve-Path $filePath), $content, (New-Object System.Text.UTF8Encoding($false)))
}

foreach ($f in $filesToFix) {
    Fix-FileEncoding $f
}
Write-Host "Done!"
