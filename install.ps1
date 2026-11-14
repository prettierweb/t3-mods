# Sets up the T3 mods on this PC. Run it again any time; it changes nothing twice.
# Undo everything with uninstall.ps1.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$t3 = Join-Path $env:LOCALAPPDATA "Programs\t3code\T3 Code (Beta).exe"

if (-not (Test-Path $t3)) { Write-Host "T3 Code is not installed. Get it from https://t3.codes and run this again." -ForegroundColor Yellow; exit 1 }
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Host "Node.js is missing. Install it with:  winget install OpenJS.NodeJS.LTS  then run this again." -ForegroundColor Yellow; exit 1 }
$v = [version]((& node -v).TrimStart("v"))
if ($v -lt [version]"22.13") { Write-Host "Node $v is too old; the mods need 22.13 or newer. Update with:  winget upgrade OpenJS.NodeJS.LTS" -ForegroundColor Yellow; exit 1 }

$launcher = Join-Path $here "mods\t3-mods.mjs"
if (-not (Test-Path (Join-Path $here "config.json"))) { Copy-Item (Join-Path $here "config.example.json") (Join-Path $here "config.json") }

# 1. a login item that attaches the mods whenever T3 opens (no window)
$startup = [Environment]::GetFolderPath("Startup")
$watch = "' T3 mods: attaches the mods whenever T3 Code opens. Remove with uninstall.ps1.`r`nCreateObject(""WScript.Shell"").Run """"""$node"""" """"$launcher"""" --watch"", 0, False"
Set-Content -Path (Join-Path $startup "T3 mods.vbs") -Value $watch -Encoding ASCII

# 2. a double-click starter in this folder (restarts T3 if it is open without the mods)
$start = "' Double-click: opens T3 Code with the mods (restarts T3 if it is open without them).`r`nCreateObject(""WScript.Shell"").Run """"""$node"""" """"$launcher"""" --restart"", 0, False"
Set-Content -Path (Join-Path $here "Start T3 with mods.vbs") -Value $start -Encoding ASCII

# 3. start now
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 't3-mods\.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process wscript.exe -ArgumentList "`"$(Join-Path $startup 'T3 mods.vbs')`""
Start-Process wscript.exe -ArgumentList "`"$(Join-Path $here 'Start T3 with mods.vbs')`""

Write-Host ""
Write-Host "Done. T3 Code is starting with the mods." -ForegroundColor Green
Write-Host "  From now on, open T3 the normal way; the mods attach by themselves."
Write-Host "  Nothing showing? Double-click 'Start T3 with mods.vbs' in this folder."
Write-Host "  Remove everything: .\uninstall.ps1"
