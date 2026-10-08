param([int]$連接埠 = 8080)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'web\index.html'))) { throw '請先執行 建置.ps1。' }
Write-Host '按 Ctrl+C 即可停止網頁伺服器。'
& node (Join-Path $PSScriptRoot '網頁伺服器.mjs') $連接埠
