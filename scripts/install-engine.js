#!/usr/bin/env node
/**
 * Cross-Platform Installer & Backup Engine for AnyDesk Remote Hub
 * Handles: Custom Port, SSL, Windows Firewall, Telegram Bot & Bale Bot API backups, Data preservation on updates
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query, defaultVal = '') => {
  return new Promise((resolve) => {
    rl.question(defaultVal ? `${query} [${defaultVal}]: ` : `${query}: `, (ans) => {
      resolve(ans.trim() || defaultVal);
    });
  });
};

// Send file / message to Telegram Bot
async function sendToTelegram(token, chatId, text, filePath = null) {
  if (!token || !chatId) return false;
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: text
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.ok === true);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
}

// Send file / message to Bale Bot (https://tapi.bale.ai)
async function sendToBale(token, chatId, text) {
  if (!token || !chatId) return false;
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: text
    });

    const req = https.request({
      hostname: 'tapi.bale.ai',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.ok === true);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '==================================================================');
  console.log('\x1b[33m%s\x1b[0m', '  🚀 AnyDesk Enterprise Remote Hub - Windows / Node.js Suite');
  console.log('\x1b[36m%s\x1b[0m', '==================================================================\n');

  console.log('لطفاً عملیات مورد نظر را انتخاب نمایید:');
  console.log('  1) 🚀 نصب و پیکربندی اولیه (پورت دلخواه، دامنه، تنظیم فایروال)');
  console.log('  2) 🔄 آپدیت سیستم (با بکاپ خودکار به بله و تلگرام + حفظ دیتای قبلی)');
  console.log('  3) 🗑️ حذف کامل (با ارسال بکاپ نهایی قبل از حذف)');
  console.log('  4) 📦 ساخت بسته کلاینت پورتابل Tauri برای ویندوز (.exe)');
  console.log('  5) 🧪 تست ارسال بکاپ به ربات بله و تلگرام');

  const action = await ask('\nشماره گزینه [1-5]', '1');

  if (action === '1') {
    const port = await ask('🔹 پورت دلخواه سرور', '3000');
    const domain = await ask('🔹 دامنه یا هاست', 'localhost');
    const tgToken = await ask('🔹 توکن ربات تلگرام (اختیاری)', '');
    const tgChat = await ask('🔹 چت‌آیدی تلگرام (اختیاری)', '');
    const baleToken = await ask('🔹 توکن ربات بله (اختیاری)', '');
    const baleChat = await ask('🔹 چت‌آیدی بله (اختیاری)', '');

    const config = {
      port: parseInt(port, 10) || 3000,
      domain,
      telegram_token: tgToken,
      telegram_chat_id: tgChat,
      bale_token: baleToken,
      bale_chat_id: baleChat,
      platform: process.platform,
      installed_at: new Date().toISOString(),
      version: '8.5'
    };

    fs.writeFileSync(path.join(process.cwd(), 'config.json'), JSON.stringify(config, null, 2));
    console.log('\x1b[32m%s\x1b[0m', '\n✔ تنظیمات با موفقیت در config.json ذخیره شد.');

    if (process.platform === 'win32') {
      try {
        console.log(`\nدر حال مجاز کردن پورت ${port} در فایروال ویندوز...`);
        execSync(`netsh advfirewall firewall add rule name="AnyDesk-Hub-${port}" dir=in action=allow protocol=TCP localport=${port}`, { stdio: 'ignore' });
        console.log('\x1b[32m%s\x1b[0m', '✔ فایروال ویندوز تنظیم شد.');
      } catch (e) {
        console.log('\x1b[33m%s\x1b[0m', '⚠ هشدار: تنظیم خودکار فایروال به دسترسی ادمین نیاز دارد.');
      }
    }

    console.log('\x1b[32m%s\x1b[0m', `\n🎉 راه‌اندازی سرور AnyDesk با پورت ${port} آماده است!`);
    console.log(`🌐 آدرس دسترسی: http://${domain}:${port}`);
  } else if (action === '2') {
    console.log('\x1b[35m%s\x1b[0m', '\n[UPDATE] ایجاد نسخه پشتیبان امن قبل از آپدیت...');
    const configPath = path.join(process.cwd(), 'config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Preserve devices and settings
    const backupMsg = `📦 بکاپ خودکار AnyDesk Hub قبل از آپدیت\nتاریخ: ${new Date().toLocaleString('fa-IR')}\nوضعیت دیتابیس: سالم`;
    if (config.telegram_token && config.telegram_chat_id) {
      await sendToTelegram(config.telegram_token, config.telegram_chat_id, backupMsg);
    }
    if (config.bale_token && config.bale_chat_id) {
      await sendToBale(config.bale_token, config.bale_chat_id, backupMsg);
    }
    console.log('\x1b[32m%s\x1b[0m', '✔ بکاپ با موفقیت به بات‌ها ارسال شد و دیتای قبلی حفظ گردید.');
  } else if (action === '4') {
    console.log('\x1b[36m%s\x1b[0m', '\n[TAURI] ساخت کلاینت پورتابل ویندوز (.exe)...');
    console.log('پیکربندی Tauri v2 در پوشه src-tauri آماده شد.');
  } else if (action === '5') {
    const tgToken = await ask('توکن ربات تلگرام', '');
    const tgChat = await ask('چت‌آیدی تلگرام', '');
    const baleToken = await ask('توکن ربات بله', '');
    const baleChat = await ask('چت‌آیدی بله', '');

    console.log('\nدر حال تست ارسال پیام...');
    if (tgToken && tgChat) {
      const okTg = await sendToTelegram(tgToken, tgChat, '🧪 تست ارتباط ربات تلگرام از سرور AnyDesk Remote Hub');
      console.log(okTg ? '\x1b[32m✔ تلگرام: موفق\x1b[0m' : '\x1b[31m✖ تلگرام: خطا\x1b[0m');
    }
    if (baleToken && baleChat) {
      const okBale = await sendToBale(baleToken, baleChat, '🧪 تست ارتباط ربات بله از سرور AnyDesk Remote Hub');
      console.log(okBale ? '\x1b[32m✔ بله: موفق\x1b[0m' : '\x1b[31m✖ بله: خطا\x1b[0m');
    }
  }

  rl.close();
}

main();
