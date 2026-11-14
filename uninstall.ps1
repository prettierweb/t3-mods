# Removes the T3 mods from this PC. T3 Code itself and your chats are not touched.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$startup = [Environment]::GetFolderPath("Startup")
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 't3-mods\.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Remove-Item (Join-Path $startup "T3 mods.vbs") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $here "Start T3 with mods.vbs") -ErrorAction SilentlyContinue

# T3's shortcuts go back to plain ones (the mods added a local-only debugging port to them)
$shell = New-Object -ComObject WScript.Shell
$places = "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs", "$env:USERPROFILE\Desktop"
Get-ChildItem $places -Filter 'T3 Code*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
  $s = $shell.CreateShortcut($_.FullName)
  if ($s.Arguments -match 'remote-debugging') { $s.Arguments = ($s.Arguments -replace '--remote-debugging-(port|address)=\S+', '').Trim(); $s.Save() }
}
Write-Host "Mods removed. Close and reopen T3 Code to get the plain app back." -ForegroundColor Green
