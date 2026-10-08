param(
    [string]$編譯器 = '',
    [string]$參考專案 = 'C:\OfficialProjects\AquariusLangTW',
    [switch]$略過驗證
)
$ErrorActionPreference = 'Stop'
if (-not $編譯器) {
    $正式目錄 = Join-Path $參考專案 'dist\releases'
    $最新套件 = Get-ChildItem -LiteralPath $正式目錄 -Directory |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($最新套件) { $編譯器 = Join-Path $最新套件.FullName 'aqua\aqua.exe' }
}
if (-not $編譯器 -or -not (Test-Path -LiteralPath $編譯器)) {
    throw '找不到星泉編譯器，請用 -編譯器 指定完整 aqua.exe 路徑。'
}
function 執行編譯器([string[]]$參數) {
    $輸出 = & $編譯器 @參數 2>&1
    $結束碼 = $LASTEXITCODE
    $輸出 | ForEach-Object { Write-Host $_ }
    if ($結束碼 -ne 0 -or ($輸出 -join "`n") -match '(?m)^ERROR:') { throw '編譯器驗證或建置失敗。' }
    return ($輸出 -join "`n")
}
Push-Location $PSScriptRoot
try {
    Write-Host "使用編譯器：$編譯器"
    New-Item -ItemType Directory -Path '驗證結果' -Force | Out-Null
    if (-not $略過驗證) {
        執行編譯器 @('build', '規則驗證.aqua', '遊戲規則.aqua', '--root', '.', '-o', '規則驗證.bottle') | Out-Null
        $報告 = 執行編譯器 @('run', '規則驗證.bottle')
        if ($報告 -notmatch '規則驗證全部通過') { throw '規則驗證未完成。' }
        [IO.File]::WriteAllText((Join-Path $PSScriptRoot '驗證結果\規則驗證.txt'), $報告, [Text.UTF8Encoding]::new($false))
    }
    執行編譯器 @('build', '貪吃蛇.aqua', '中文介面.aqua', '遊戲規則.aqua', '--root', '.', '-o', '貪吃蛇.bottle') | Out-Null
    執行編譯器 @('build', '貪吃蛇.bottle', '--target', 'web', '-o', './web') | Out-Null

    # 僅本專案的輸出外殼做在地化；編譯器原專案保持唯讀。
    $首頁路徑 = Join-Path $PSScriptRoot 'web\index.html'
    $首頁 = [IO.File]::ReadAllText($首頁路徑)
    $首頁 = $首頁.Replace('lang="en"', 'lang="zh-Hant"').Replace('<title>Aquarius Web VM</title>', '<title>青芽・貪吃蛇</title>')
    $首頁 = $首頁.Replace('outline:none}', 'outline:none;touch-action:none}').Replace('background:#0c1624', 'background:#f8f8f0')
    [IO.File]::WriteAllText($首頁路徑, $首頁, [Text.UTF8Encoding]::new($false))
    $啟動路徑 = Join-Path $PSScriptRoot 'web\app.mjs'
    $啟動 = [IO.File]::ReadAllText($啟動路徑)
    $啟動 = $啟動.Replace('error.textContent=e.message;', 'console.error(e);error.textContent="遊戲無法啟動。請透過本機網址或安全連線開啟，並確認瀏覽器支援圖形加速。";')
    $啟動 = $啟動.Replace("output.textContent+=e.message+'\n';", 'output.textContent+="遊戲執行中發生問題。請重新載入頁面。\n";')
    [IO.File]::WriteAllText($啟動路徑, $啟動, [Text.UTF8Encoding]::new($false))
    $繪圖路徑 = Join-Path $PSScriptRoot 'web\processing.mjs'
    $繪圖 = [IO.File]::ReadAllText($繪圖路徑).Replace('Aquarius text input', '遊戲鍵盤輸入')
    [IO.File]::WriteAllText($繪圖路徑, $繪圖, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '驗證結果\編譯器.txt'), $編譯器, [Text.UTF8Encoding]::new($false))
    Write-Host '完成：貪吃蛇.bottle 與 ./web。'
} finally { Pop-Location }
