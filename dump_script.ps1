
$raw = [IO.File]::ReadAllBytes('fix_encoding.ps1')
[BitConverter]::ToString($raw)
