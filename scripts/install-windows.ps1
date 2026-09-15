<#
.SYNOPSIS
    AnyDesk Enterprise Remote Hub - Windows Node.js Installer & Manager
.DESCRIPTION
    Automated Windows installer script for AnyDesk Remote Hub using Node.js & PowerShell.
    Features: Custom Port, Domain/Localhost, Windows Firewall rule, Background Service, Bale & Telegram Auto-Backup.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "AnyDesk Remote Hub - Windows Installer Suite"

Clear-Host
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "    AnyDesk Enterprise Remote Hub - Windows Node.js Installer     " -ForegroundColor Yellow -NoNewline
Write-Host " [v8.5]" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[WARN] جهت تنظیم سرویس ویندوز و فایروال، بهتر است این اسکریپت را به عنوان Administrator اجرا کنید." -ForegroundColor Yellow
}

# 2. Check Node.js and NPM
Write-Host "[1/5] بررسی پیش‌نیاز Node.js و NPM..." -ForegroundColor Cyan
try {
    $nodeVer = node -v
    Write-Host "  -> Node.js یافت شد: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js روی این سیستم ویندوز یافت نشد!" -ForegroundColor Red
    Write-Host "لطفاً ابتدا Node.js نسخه LTS را از https://nodejs.org دانلود و نصب کنید." -ForegroundColor Yellow
    Pause
    Exit
}

# 3. Prompt user for settings
Write-Host "`n[2/5] تنظیمات پورت و دامنه ویندوز:" -ForegroundColor Cyan
$customPort = Read-Host "🔹 پورت دلخواه برای سرور ویندوز (پیش‌فرض: 3000)"
if ([string]::IsNullOrWhiteSpace($customPort)) { $customPort = "3000" }

$customDomain = Read-Host "🔹 دامنه یا آی‌پی محلی (پیش‌فرض: localhost)"
if ([string]::IsNullOrWhiteSpace($customDomain)) { $customDomain = "localhost" }

Write-Host "`n[تنظیمات پشتیبان‌گیری ربات‌های بله و تلگرام]" -ForegroundColor Yellow
$tgToken = Read-Host "🔹 توکن ربات تلگرام (اختیاری)"
$tgChat = Read-Host "🔹 چت‌آیدی (Chat ID) تلگرام (اختیاری)"
$baleToken = Read-Host "🔹 توکن ربات بله (Bale Bot Token - اختیاری)"
$baleChat = Read-Host "🔹 چت‌آیدی (Chat ID) بله (اختیاری)"

# 4. Save Config JSON
$installDir = Get-Location
$configFile = Join-Path $installDir "config.json"
$configData = @{
    port = [int]$customPort
    domain = $customDomain
    telegram_token = $tgToken
    telegram_chat_id = $tgChat
    bale_token = $baleToken
    bale_chat_id = $baleChat
    os = "windows"
    installed_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    version = "8.5"
} | ConvertTo-Json -Depth 3

Set-Content -Path $configFile -Value $configData -Encoding UTF8
Write-Host "`n[3/5] ذخیره پیکربندی در $configFile..." -ForegroundColor Green

# 5. Open Windows Firewall Port
Write-Host "`n[4/5] باز کردن پورت $customPort در فایروال ویندوز (Windows Defender Firewall)..." -ForegroundColor Cyan
try {
    netsh advfirewall firewall add rule name="AnyDesk-Remote-Hub-$customPort" dir=in action=allow protocol=TCP localport=$customPort | Out-Null
    Write-Host "  -> پورت $customPort با موفقیت در فایروال ویندوز مجاز شد." -ForegroundColor Green
} catch {
    Write-Host "  -> هشدار: امکان تنظیم فایروال بدون دسترسی Admin میسر نبود." -ForegroundColor Yellow
}

# 6. Build and Dependencies
Write-Host "`n[5/5] نصب پکیج‌های npm و کامپایل نسخه ویندوز..." -ForegroundColor Cyan
npm install --silent
npm run build

# 7. Create Windows Startup Batch Launcher
$runBat = Join-Path $installDir "Start-AnyDesk-Server.bat"
$batContent = @"
@echo off
title AnyDesk Enterprise Remote Hub (Port: $customPort)
set PORT=$customPort
set NODE_ENV=production
node server.ts
pause
"@
Set-Content -Path $runBat -Value $batContent

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  🎉 نصب و آماده‌سازی AnyDesk Remote Hub در ویندوز تکمیل شد!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "🔗 آدرس دسترسی در مرورگر: http://localhost:$customPort" -ForegroundColor Cyan
Write-Host "🚀 جهت اجرای سرویس، فایل 'Start-AnyDesk-Server.bat' را اجرا نمایید." -ForegroundColor Yellow
Write-Host ""
Pause
