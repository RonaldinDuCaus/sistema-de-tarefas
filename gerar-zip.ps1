$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$zipPath = Join-Path (Split-Path -Parent $projectPath) "tarefas-firebase-$timestamp.zip"
$include = @('public', 'README.md', 'COMECAR.txt', 'firestore.rules', 'firebase.json', 'gerar-zip.ps1', 'evidencias')
$files = $include | ForEach-Object { Join-Path $projectPath $_ }
Compress-Archive -LiteralPath $files -DestinationPath $zipPath
Write-Host "Pacote criado: $zipPath"
