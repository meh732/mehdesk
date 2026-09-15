# 🚀 meh desk (v9.0)

<div align="center">

<img src="https://raw.githubusercontent.com/meh732/mehdesk/main/public/icon.svg" width="140" height="140" alt="meh desk Official Logo" style="border-radius: 28px;" />

<h2>meh desk — سیستم ریموت دسکتاپ و مدیریت ناوگان ابری</h2>
<p><strong>Next-Gen Ultra Low Latency WebRTC Remote Desktop & Fleet Management</strong></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-brightgreen.svg)](https://nodejs.org)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Ultra--Low%20Latency-blue.svg)](https://webrtc.org)
[![PWA Ready](https://img.shields.io/badge/PWA-iOS%20%7C%20Android%20%7C%20Desktop-purple.svg)](https://web.dev/progressive-web-apps/)
[![Telegram & Bale Bot](https://img.shields.io/badge/Bots-Telegram%20%26%20Bale-red.svg)](#-ربات‌های-پشتیبان‌گیری-و-اعلان-ادمین)

[**نصب سریع با یک دستور**](#-نصب-سریع-تک‌خطی-توصیه-شده) • [**امکانات کلیدی**](#-امکانات-و-قابلیت‌ها) • [**دستورات پنل مدیریت**](#-ابزار-مدیریت-ترمینال-mehdesk) • [**English Documentation**](#-english-overview)

</div>

---

## ⚡ نصب سریع تک‌خطی (توصیه شده)

جهت نصب خودکار، بیلد بهینه، تنظیم سرویس دائم Systemd و ساخت دستور مدیریت در ترمینال، دستور زیر را در سرور لینوکس خود (Ubuntu / Debian / CentOS / Rocky / AlmaLinux) با دسترسی روت اجرا کنید:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/meh732/mehdesk/main/install.sh)
```

یا با استفاده از `curl`:

```bash
curl -sSL https://raw.githubusercontent.com/meh732/mehdesk/main/install.sh | sudo bash
```

> 💡 **نکته:** پس از اتمام نصب، برای مدیریت سرویس، آپدیت بدون خاموشی، تغییر پورت و دریافت لاگ‌ها، کافیست در هر کجای ترمینال دستور **`mehdesk`** را تایپ کنید.

---

## 🖥️ ابزار مدیریت ترمینال (`mehdesk`)

با تایپ دستور `mehdesk` در ترمینال سرور، منوی کنترل حرفه‌ای با قابلیت‌های زیر در اختیار شماست:

```text
  ███╗   ███╗███████╗██╗  ██╗    ██████╗ ███████╗███████╗██╗  ██╗
  ████╗ ████║██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██║ ██╔╝
  ██╔████╔██║█████╗  ███████║    ██║  ██║█████╗  ███████╗█████╔╝ 
  ██║╚██╔╝██║██╔══╝  ██╔══██║    ██║  ██║██╔══╝  ╚════██║██╔═██╗ 
  ██║ ╚═╝ ██║███████╗██║  ██║    ██████╔╝███████╗███████║██║  ██╗
  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
                 مدیریت سرور meh desk v9.0
===================================================================
 وضعیت سرویس: ● فعال و در حال اجرا (Running)
 پورت فعال: 3000 | دامنه: IP مستقیم
-------------------------------------------------------------------
  1) شروع / راه‌اندازی مجدد سرویس (Restart)
  2) توقف سرویس (Stop)
  3) مشاهده لاگ‌های زنده سرور و اتصالات ریموت (Live Logs)
  4) آپدیت meh desk به آخرین نسخه گیت‌هاب بدون حذف دیتا (Update)
  5) تغییر پورت سرویس (Change Port)
  6) تنظیم دامنه و فعال‌سازی رایگان SSL Let's Encrypt
  7) ارسال فوری فایل بکاپ دیتابیس به تلگرام و بله (Backup)
  8) بازیابی و ریست پین ادمین مستر (Reset Admin PIN)
  9) حذف کامل سرویس meh desk (Uninstall)
  0) خروج از پنل
```

---

## ✨ امکانات و قابلیت‌ها

### 🎥 ۱. اشتراک صفحه و ریموت دسکتاپ با WebRTC Ultra Low Latency
- پخش زنده مانیتور با کیفیت بالا (Full HD / 4K) تا ۶۰ فریم بر ثانیه
- تاخیر کمتر از ۵۰ میلی‌ثانیه با کدک‌های H.264، VP8، VP9 و AV1
- کنترل کامل ماوس و کیبورد با پشتیبانی از کلیدهای ترکیبی (Ctrl+Alt+Del, Alt+Tab و...)
- انتقال صدای زنده سیستم و تب‌ها به همراه پشتیبانی از میکروفون دوطرفه

### 📱 ۲. نرم‌افزار پیش‌رونده وب (PWA) برای گوشی و کامپیوتر
- امکان نصب با یک کلیک روی تمامی سیستم‌عامل‌ها (Android, iOS, Windows, macOS, Linux)
- اجرای تمام‌صفحه بدون نوار آدرس مرورگر با آیکون اختصاصی
- اتصال سریع گوشی به کامپیوتر از طریق اسکن بارکد QR

### 🛡️ ۳. امنیت و پنجره اخذ مجوز صریح (Consent Flow)
- پیش از اشتراک صفحه، پنجره اخذ مجوز امنیتی باز شده و کاربر می‌تواند موارد مجاز را انتخاب کند:
  - کنترل ماوس و کیبورد
  - همگام‌سازی کلیپ‌بورد
  - انتقال فایل
  - انتقال صدای سیستم
- قطع آنی سشن با یک کلیک توسط میزبان

### 🤖 ۴. ربات‌های پشتیبان‌گیری و اعلان ادمین (Telegram & Bale)
- **ربات تلگرام:** ارسال اعلان لاگین‌ها و سشن‌های جدید + ارسال خودکار فایل دیتابیس و وضعیت سرور
- **پیام‌رسان بله (`tapi.bale.ai`):** اتصال مستقیم به سرورهای داخلی بله بدون نیاز به فیلترشکن
- **پشتیبان‌گیری خودکار زمان‌بندی‌شده:** ارسال فایل‌های دیتابیس بر اساس بازه انتخابی (هر ۱، ۳، ۶، ۱۲ یا ۲۴ ساعت)
- دکمه ارسال فوری بکاپ با یک کلیک از داخل وب پنل و ترمینال

### 📁 ۵. مدیریت و انتقال فایل دوطرفه (File Manager)
- مرورگر فایل داخلی با قابلیت دانلود و آپلود چندگانه
- پشتیبانی از کشیدن و رها کردن فایل‌ها (Drag & Drop) روی صفحه سشن

### 💻 ۶. ترمینال ریموت و دسترسی بدون نظارت (Unattended Access)
- دسترسی به شل لینوکس و ویندوز در محیط وب
- امکان تعریف رمز عبور دائم (Unattended Access Password) برای کنترل سرورها در غیاب کاربر
- پشتیبانی از تایید دو مرحله‌ای (2FA OTP)

---

## 🔧 نصب دستی (Manual Installation)

در صورتی که مایل به نصب دستی بدون اسکریپت خودکار هستید:

```bash
# ۱. کلون ریپازیتوری
git clone https://github.com/meh732/mehdesk.git
cd mehdesk

# ۲. نصب وابستگی‌ها
npm install

# ۳. بیلد پروژه
npm run build

# ۴. اجرای سرور
node dist/server.cjs
```

سرور روی پورت `3000` (یا پورت تنظیم‌شده در `.env`) در دسترس خواهد بود: `http://SERVER_IP:3000`

---

## 🌐 تنظیمات دامنه و SSL رایگان (Nginx Reverse Proxy)

اگر دامنه اختصاصی دارید (مانند `remote.yourdomain.com`):

```nginx
server {
    server_name remote.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

سپس برای صدور گواهی SSL رایگان:
```bash
certbot --nginx -d remote.yourdomain.com
```

---

## 🌍 English Overview

**meh desk** is a modern, enterprise-ready, self-hosted Remote Desktop and Screen Sharing solution built with **TypeScript, React, Node.js, and WebRTC**.

### 🌟 Features:
- **Zero-Install PWA:** Runs natively on Android, iOS, Windows, macOS, and Linux.
- **Ultra-low latency WebRTC streaming:** 60 FPS HD screen broadcast.
- **Granular Security Consent:** Explicit user permission prompt before broadcasting.
- **Admin Bots & Auto Backup:** Native integration with **Telegram Bot API** and **Bale Messenger API** (`tapi.bale.ai`).
- **Interactive Terminal CLI (`mehdesk`):** Easily start, stop, restart, view live logs, switch ports, enable SSL, and backup with zero downtime.
- **Bi-directional File Transfer:** Drag-and-drop file sharing.
- **Unattended Access:** Configurable unattended passwords and 2FA protection.

### 🚀 Quick Install:
```bash
bash <(curl -Ls https://raw.githubusercontent.com/meh732/mehdesk/main/install.sh)
```

---

## 📄 لایسنس / License

این پروژه تحت لایسنس [MIT](LICENSE) منتشر شده است و استفاده از آن برای مقاصد شخصی و تجاری کاملاً آزاد و رایگان می‌باشد.
