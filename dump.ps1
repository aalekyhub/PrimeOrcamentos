
$raw = [IO.File]::ReadAllText('components/BudgetManager.tsx', [System.Text.Encoding]::UTF8)
$lines = $raw -split "`n"
$results = @()
foreach ($line in $lines) {
    if ($line -like "*t*cnicos*") {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($line)
        $results += "Line: $line"
        $results += "Bytes: $([BitConverter]::ToString($bytes))"
    }
}
$results | Out-File -FilePath "hex_dump_budget.txt" -Encoding utf8
