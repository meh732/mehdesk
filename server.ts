import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// In-memory registry of active peer rooms and remote desks
interface PeerClient {
  id: string;
  rawId?: string;
  ws: WebSocket;
  alias?: string;
  isHost?: boolean;
  unattendedPassword?: string;
  deviceInfo?: {
    os: string;
    name: string;
    screenResolution?: string;
  };
}

const activeClients = new Map<string, PeerClient>();
const rooms = new Map<string, Set<string>>(); // hostId -> Set of viewerIds

// API: Check server health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    activePeers: activeClients.size,
    timestamp: new Date().toISOString()
  });
});

// API: Get online devices or search by ID
app.get("/api/devices/lookup/:id", (req, res) => {
  const targetId = req.params.id.replace(/\s+/g, "");
  const peer = activeClients.get(targetId);
  if (peer) {
    res.json({
      found: true,
      id: peer.id,
      alias: peer.alias || `${peer.id}@desk`,
      isHost: peer.isHost,
      hasPassword: !!peer.unattendedPassword,
      deviceInfo: peer.deviceInfo
    });
  } else {
    res.json({ found: false });
  }
});

// In-memory admin settings store
interface AdminConfig {
  adminPin: string;
  telegramToken: string;
  telegramAdminChatIds: string[];
  baleToken: string;
  baleAdminChatIds: string[];
  autoBackupEnabled: boolean;
  backupIntervalHours: number;
  notifyOnConnection: boolean;
  serverDomain: string;
  serverPort: number;
  enforce2FA: boolean;
  sessionTimeoutMinutes: number;
}

let adminConfig: AdminConfig = {
  adminPin: "123456",
  telegramToken: "",
  telegramAdminChatIds: [],
  baleToken: "",
  baleAdminChatIds: [],
  autoBackupEnabled: true,
  backupIntervalHours: 6,
  notifyOnConnection: true,
  serverDomain: "localhost",
  serverPort: 3000,
  enforce2FA: false,
  sessionTimeoutMinutes: 120
};

// API: Get Admin Settings
app.get("/api/admin/settings", (req, res) => {
  res.json({
    success: true,
    config: adminConfig,
    activeSessionsCount: rooms.size,
    registeredDevicesCount: activeClients.size
  });
});

// API: Save Admin Settings
app.post("/api/admin/settings", (req, res) => {
  const newConfig = req.body;
  adminConfig = {
    ...adminConfig,
    ...newConfig,
    telegramAdminChatIds: Array.isArray(newConfig.telegramAdminChatIds) 
      ? newConfig.telegramAdminChatIds 
      : (newConfig.telegramAdminChatIds ? String(newConfig.telegramAdminChatIds).split(/[\s,]+/).filter(Boolean) : []),
    baleAdminChatIds: Array.isArray(newConfig.baleAdminChatIds) 
      ? newConfig.baleAdminChatIds 
      : (newConfig.baleAdminChatIds ? String(newConfig.baleAdminChatIds).split(/[\s,]+/).filter(Boolean) : [])
  };
  res.json({ success: true, config: adminConfig });
});

// API: Dispatch Full Backup to all configured Telegram and Bale Admins
app.post("/api/admin/dispatch-backup", async (req, res) => {
  const https = await import("https");
  const now = new Date().toLocaleString("fa-IR");
  
  const backupSummary = {
    timestamp: new Date().toISOString(),
    totalOnlinePeers: activeClients.size,
    peers: Array.from(activeClients.values()).map(p => ({
      id: p.id,
      alias: p.alias,
      isHost: p.isHost,
      device: p.deviceInfo?.name,
      os: p.deviceInfo?.os
    }))
  };

  const textPayload = `📦 پشتیبان‌گیری خودکار meh desk\n📅 تاریخ: ${now}\n💻 تعداد کلاینت‌های متصل: ${activeClients.size}\n🔒 وضعیت سرور: امن و فعال\n🔗 دامنه: ${adminConfig.serverDomain}:${adminConfig.serverPort}`;
  const results = { telegramSent: 0, baleSent: 0, errors: [] as string[] };

  // Send to Telegram Admins
  if (adminConfig.telegramToken && adminConfig.telegramAdminChatIds.length > 0) {
    for (const chatId of adminConfig.telegramAdminChatIds) {
      try {
        const body = JSON.stringify({ chat_id: chatId, text: textPayload });
        await new Promise<void>((resolve) => {
          const r = https.request({
            hostname: "api.telegram.org",
            path: `/bot${adminConfig.telegramToken}/sendMessage`,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
            timeout: 5000
          }, () => resolve());
          r.on("error", () => resolve());
          r.write(body);
          r.end();
        });
        results.telegramSent++;
      } catch (err: any) {
        results.errors.push(`Telegram (${chatId}): ${err.message}`);
      }
    }
  }

  // Send to Bale Admins (https://tapi.bale.ai)
  if (adminConfig.baleToken && adminConfig.baleAdminChatIds.length > 0) {
    for (const chatId of adminConfig.baleAdminChatIds) {
      try {
        const body = JSON.stringify({ chat_id: chatId, text: textPayload });
        await new Promise<void>((resolve) => {
          const r = https.request({
            hostname: "tapi.bale.ai",
            path: `/bot${adminConfig.baleToken}/sendMessage`,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
            timeout: 5000
          }, () => resolve());
          r.on("error", () => resolve());
          r.write(body);
          r.end();
        });
        results.baleSent++;
      } catch (err: any) {
        results.errors.push(`Bale (${chatId}): ${err.message}`);
      }
    }
  }

  res.json({
    success: true,
    results,
    backupData: backupSummary,
    message: `بکاپ به ${results.telegramSent} ادمین تلگرام و ${results.baleSent} ادمین بله ارسال شد.`
  });
});

// API: Dynamic Linux Bash Script Generator & Downloader (Supports mehdesk-linux-manager.sh and install.sh)
app.get(["/install.sh", "/api/scripts/install", "/api/scripts/linux", "/api/scripts/mehdesk-linux"], (req, res) => {
  let scriptPath = path.join(process.cwd(), "install.sh");
  if (!fs.existsSync(scriptPath)) {
    scriptPath = path.join(process.cwd(), "scripts", "mehdesk-linux-manager.sh");
  }
  if (!fs.existsSync(scriptPath)) {
    scriptPath = path.join(process.cwd(), "scripts", "anydesk-linux-manager.sh");
  }
  if (fs.existsSync(scriptPath)) {
    let content = fs.readFileSync(scriptPath, "utf8");
    // If admin has configured bot tokens, inject them as default values into the script!
    if (adminConfig.telegramToken) {
      content = content.replace(/TG_BOT_TOKEN="[^"]*"/, `TG_BOT_TOKEN="${adminConfig.telegramToken}"`);
    }
    if (adminConfig.telegramAdminChatIds.length > 0) {
      content = content.replace(/TG_CHAT_ID="[^"]*"/, `TG_CHAT_ID="${adminConfig.telegramAdminChatIds[0]}"`);
    }
    if (adminConfig.baleToken) {
      content = content.replace(/BALE_BOT_TOKEN="[^"]*"/, `BALE_BOT_TOKEN="${adminConfig.baleToken}"`);
    }
    if (adminConfig.baleAdminChatIds.length > 0) {
      content = content.replace(/BALE_CHAT_ID="[^"]*"/, `BALE_CHAT_ID="${adminConfig.baleAdminChatIds[0]}"`);
    }

    res.setHeader("Content-Type", "text/x-shellscript");
    res.setHeader("Content-Disposition", 'attachment; filename="install.sh"');
    res.send(content);
  } else {
    res.status(404).send("#!/bin/bash\necho 'meh desk script not found on server'");
  }
});

// API: Dynamic Windows PowerShell Script Downloader
app.get("/api/scripts/windows-ps1", (req, res) => {
  const scriptPath = path.join(process.cwd(), "scripts", "install-windows.ps1");
  if (fs.existsSync(scriptPath)) {
    let content = fs.readFileSync(scriptPath, "utf8");
    if (adminConfig.telegramToken) {
      content = content.replace(/\$tgToken = "[^"]*"/, `$tgToken = "${adminConfig.telegramToken}"`);
    }
    if (adminConfig.baleToken) {
      content = content.replace(/\$baleToken = "[^"]*"/, `$baleToken = "${adminConfig.baleToken}"`);
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="install-windows.ps1"');
    res.send(content);
  } else {
    res.status(404).send("# PowerShell script not found");
  }
});

// API: Cross-compile build script for Windows (.exe) via Tauri
app.get(["/build-tauri-windows.sh", "/api/scripts/build-tauri-windows"], (req, res) => {
  const scriptPath = path.join(process.cwd(), "scripts", "build-tauri-windows.sh");
  if (fs.existsSync(scriptPath)) {
    const content = fs.readFileSync(scriptPath, "utf8");
    res.setHeader("Content-Type", "text/x-shellscript");
    res.setHeader("Content-Disposition", 'attachment; filename="build-tauri-windows.sh"');
    res.send(content);
  } else {
    res.status(404).send("#!/bin/bash\necho 'build-tauri-windows.sh not found on server'");
  }
});

// Downloads Static Serving & Direct Windows .exe Route
app.use("/downloads", express.static(path.join(process.cwd(), "public", "downloads")));
app.use("/downloads", express.static(path.join(process.cwd(), "dist", "downloads")));

app.get(["/downloads/mehdesk-portable.exe", "/downloads/mehdesk-windows.exe", "/api/download/windows-exe"], (req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), "public", "downloads", "mehdesk-portable.exe"),
    path.join(process.cwd(), "dist", "downloads", "mehdesk-portable.exe"),
    path.join(process.cwd(), "src-tauri", "target", "x86_64-pc-windows-gnu", "release", "mehdesk-portable.exe"),
    path.join(process.cwd(), "src-tauri", "target", "x86_64-pc-windows-gnu", "release", "mehdesk-Portable.exe"),
    path.join("/usr/local/mehdesk", "public", "downloads", "mehdesk-portable.exe"),
    path.join("/usr/local/mehdesk", "dist", "downloads", "mehdesk-portable.exe")
  ];

  for (const exePath of possiblePaths) {
    if (fs.existsSync(exePath)) {
      res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
      res.setHeader("Content-Disposition", 'attachment; filename="mehdesk-portable.exe"');
      return res.sendFile(exePath);
    }
  }

  // If not compiled yet on this server, check if NSIS installer exists
  const nsisDir = path.join(process.cwd(), "src-tauri", "target", "x86_64-pc-windows-gnu", "release", "bundle", "nsis");
  if (fs.existsSync(nsisDir)) {
    const files = fs.readdirSync(nsisDir);
    const exe = files.find((f: string) => f.endsWith(".exe"));
    if (exe) {
      res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
      res.setHeader("Content-Disposition", `attachment; filename="${exe}"`);
      return res.sendFile(path.join(nsisDir, exe));
    }
  }

  res.status(404).json({
    status: "not_compiled_yet",
    message: "فایل اگزه ویندوز هنوز کامپایل نشده است. لطفاً دستور 'bash scripts/build-tauri-windows.sh' یا گزینه ۴ منوی منیجر را در سرور لینوکس اجرا فرمایید.",
    compileCommand: "bash scripts/build-tauri-windows.sh",
    target: "x86_64-pc-windows-gnu"
  });
});

// API: Test Bot connection for Telegram & Bale
app.post("/api/bots/test", async (req, res) => {
  const { telegramToken, telegramChatId, baleToken, baleChatId } = req.body;
  const results = {
    telegram: { tested: false, success: false, message: "" },
    bale: { tested: false, success: false, message: "" }
  };

  const https = await import("https");

  // Test Telegram
  if (telegramToken && telegramChatId) {
    results.telegram.tested = true;
    try {
      const tgPayload = JSON.stringify({
        chat_id: telegramChatId,
        text: `🚀 تست اتصال موفق ربات تلگرام از سرور AnyDesk Remote Hub\n📅 تاریخ: ${new Date().toLocaleString('fa-IR')}\nوضعیت: آنلاین و آماده پشتیبان‌گیری خودکار`
      });

      const tgSuccess = await new Promise<boolean>((resolve) => {
        const req = https.request({
          hostname: "api.telegram.org",
          path: `/bot${telegramToken}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(tgPayload)
          },
          timeout: 5000
        }, (resp) => {
          let data = "";
          resp.on("data", chunk => data += chunk);
          resp.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.ok === true);
            } catch {
              resolve(false);
            }
          });
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => { req.destroy(); resolve(false); });
        req.write(tgPayload);
        req.end();
      });

      results.telegram.success = tgSuccess;
      results.telegram.message = tgSuccess ? "پیام با موفقیت به تلگرام ارسال شد." : "خطا در ارتباط با سرور تلگرام یا اشتباه بودن توکن/چت‌آیدی.";
    } catch (e: any) {
      results.telegram.message = e.message;
    }
  }

  // Test Bale (https://tapi.bale.ai)
  if (baleToken && baleChatId) {
    results.bale.tested = true;
    try {
      const balePayload = JSON.stringify({
        chat_id: baleChatId,
        text: `🚀 تست اتصال موفق ربات بله از سرور AnyDesk Remote Hub\n📅 تاریخ: ${new Date().toLocaleString('fa-IR')}\nوضعیت: آنلاین و آماده پشتیبان‌گیری خودکار`
      });

      const baleSuccess = await new Promise<boolean>((resolve) => {
        const req = https.request({
          hostname: "tapi.bale.ai",
          path: `/bot${baleToken}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(balePayload)
          },
          timeout: 5000
        }, (resp) => {
          let data = "";
          resp.on("data", chunk => data += chunk);
          resp.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.ok === true);
            } catch {
              resolve(false);
            }
          });
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => { req.destroy(); resolve(false); });
        req.write(balePayload);
        req.end();
      });

      results.bale.success = baleSuccess;
      results.bale.message = baleSuccess ? "پیام با موفقیت به پیام‌رسان بله ارسال شد." : "خطا در اتصال به API بله (tapi.bale.ai) یا توکن نامعتبر است.";
    } catch (e: any) {
      results.bale.message = e.message;
    }
  }

  res.json({ success: true, results });
});

// API: AI Remote IT Support & Troubleshooting
app.post("/api/ai/diagnose", async (req, res) => {
  try {
    const { problemDescription, os, systemInfo } = req.body;
    const ai = getAI();

    if (!ai) {
      // Fallback smart diagnosis if key not configured
      return res.json({
        success: true,
        analysis: `تحلیل هوشمند (آفلاین): مشکل گزارش شده در سیستم ${os || 'ویندوز'}: "${problemDescription}".\n\nپیشنهادهای رفع عیب:\n1. بررسی لاگ رویدادها (Event Viewer) برای خطاهای سیستمی اخیر.\n2. ریستارت سرویس‌های مرتبط با دستور: net stop [service] && net start [service]\n3. بررسی مصرف منابع با ابزار Task Manager / htop.\n4. پاکسازی فایل‌های کش موقت با اجرای دستور: cleanmgr یا rm -rf /tmp/*`,
        suggestedCommands: [
          "sfc /scannow",
          "dism /online /cleanup-image /restorehealth",
          "ipconfig /flushdns",
          "tasklist /v"
        ]
      });
    }

    const prompt = `شما یک متخصص ارشد پشتیبانی فنی و Helpdesk شبکه و ریموت دسکتاپ هستید (مانند تکنسین ارشد AnyDesk).
کاربر این مشکل را در کامپیوتر مقصد گزارش کرده است:
سیستم عامل: ${os || 'Windows 11'}
مشخصات سیستم: ${JSON.stringify(systemInfo || {})}
شرح مشکل: "${problemDescription}"

لطفاً پاسخی کاربردی، دقیق و ساختاریافته به زبان فارسی به فرمت JSON ارائه دهید با فیلدهای:
{
  "analysis": "توضیح دلیل رخ دادن مشکل و مراحل گام به گام حل آن به فارسی روان",
  "rootCause": "علت احتمالی ریشه‌ای",
  "suggestedCommands": ["دستور 1 برای ترمینال", "دستور 2", "دستور 3"],
  "preventativeTips": "توصیه برای عدم تکرار مشکل"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    try {
      const parsed = JSON.parse(text);
      res.json({ success: true, ...parsed });
    } catch {
      res.json({ success: true, analysis: text, suggestedCommands: ["ipconfig /all", "systeminfo"] });
    }
  } catch (error: any) {
    console.error("AI Diagnose error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "خطا در پردازش با هوش مصنوعی"
    });
  }
});

// API: AI Remote Script Generator
app.post("/api/ai/script-generator", async (req, res) => {
  try {
    const { taskDescription, scriptType } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json({
        success: true,
        script: `# PowerShell script for: ${taskDescription}\nWrite-Host "Running automated task..."\nGet-Process | Sort-Object CPU -Descending | Select-Object -First 10\nWrite-Host "Task completed successfully."`,
        explanation: "اسکریپت پیش‌فرض برای دریافت پرمصرف‌ترین فرآیندهای سیستم."
      });
    }

    const prompt = `یک اسکریپت ریموت ${scriptType || 'PowerShell / Bash'} تمیز و امن برای وظیفه زیر بنویس:
وظیفه: "${taskDescription}"
فرمت خروجی JSON با فیلدهای:
{
  "script": "متن کامل اسکریپت",
  "explanation": "توضیح فارسی از نحوه کار اسکریپت",
  "riskLevel": "Low / Medium / High",
  "requiredPrivileges": "Admin / Normal"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Universal ID normalizer: converts Persian & Arabic numerals to ASCII and strips all spaces/formatting
export function normalizeDeskId(id: string | null | undefined): string {
  if (!id) return "";
  return id
    .toString()
    .trim()
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728)) // Persian ۰-۹
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584)) // Arabic ٠-٩
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

// Helper to find client by ID (normalized) or by Alias
function findActiveClient(query: string | undefined): any {
  if (!query) return null;
  const clean = normalizeDeskId(query);
  if (!clean) return null;

  // 1. Direct normalized ID lookup
  if (activeClients.has(clean)) {
    const c = activeClients.get(clean);
    if (c && c.ws && c.ws.readyState === WebSocket.OPEN) {
      return c;
    }
  }

  // 2. Linear scan with normalization for Alias or formatted IDs
  for (const client of activeClients.values()) {
    if (!client.ws || client.ws.readyState !== WebSocket.OPEN) continue;
    const cId = normalizeDeskId(client.id);
    const cAlias = normalizeDeskId(client.alias);
    if (cId === clean || cAlias === clean || (cAlias && cAlias.includes(clean))) {
      return client;
    }
  }
  return null;
}

// API endpoint to check if an ID is currently active & online on the server
app.get("/api/check-client/:id", (req, res) => {
  const queryId = req.params.id;
  const client = findActiveClient(queryId);
  res.json({
    success: true,
    query: queryId,
    normalized: normalizeDeskId(queryId),
    online: !!client,
    alias: client?.alias || null,
    isHost: !!client?.isHost
  });
});

// API endpoint to get list of currently connected online devices
app.get("/api/online-devices", (req, res) => {
  const list = Array.from(activeClients.values()).map(c => ({
    id: c.id,
    rawId: c.rawId,
    alias: c.alias,
    isHost: c.isHost,
    deviceInfo: c.deviceInfo
  }));
  res.json({ success: true, count: list.length, devices: list });
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket Signaling server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  let peerId: string = "";

  ws.on("message", (rawMessage: string) => {
    try {
      const data = JSON.parse(rawMessage.toString());

      switch (data.type) {
        // Register client ID (Host or Client)
        case "register": {
          const cleanId = normalizeDeskId(data.id);
          if (!cleanId) return;

          if (peerId && peerId !== cleanId) {
            const oldClient = activeClients.get(peerId);
            if (oldClient && oldClient.ws === ws) {
              activeClients.delete(peerId);
            }
          }
          peerId = cleanId;

          activeClients.set(peerId, {
            id: peerId,
            rawId: data.id,
            ws,
            alias: data.alias || `${peerId}@desk`,
            isHost: !!data.isHost,
            unattendedPassword: data.unattendedPassword || "",
            deviceInfo: data.deviceInfo
          });

          console.log(`[WS] Client Registered: ${peerId} (raw: ${data.id}, alias: ${data.alias || 'no-alias'}), Total Active: ${activeClients.size}`);

          ws.send(JSON.stringify({
            type: "registered",
            id: peerId,
            status: "ready"
          }));
          break;
        }

        // Connection request from viewer to host
        case "connect_request":
        case "request_connect": {
          const targetQuery = data.targetId || data.toId;
          const targetHost = findActiveClient(targetQuery);
          const fromNormalized = normalizeDeskId(data.fromId || data.senderId || peerId);

          console.log(`[WS] Connection request from '${fromNormalized}' to '${targetQuery}' -> Found: ${!!targetHost}`);

          // Prevent connecting to oneself
          if (targetHost && targetHost.id === fromNormalized) {
            console.warn(`[WS] Client '${fromNormalized}' tried to connect to itself.`);
            ws.send(JSON.stringify({
              type: "connect_error",
              message: `شما شناسه سیستم فعلی خودتان (${targetQuery}) را وارد کرده‌اید! در مه دسک برای برقراری ارتباط ریموت، باید شناسه کامپیوتر یا سرور مقصد را وارد نمایید. اگر قصد تست دارید، یک پنجره ناشناس (Incognito) باز فرمایید.`
            }));
            break;
          }

          if (targetHost && targetHost.ws.readyState === WebSocket.OPEN) {
            targetHost.ws.send(JSON.stringify({
              type: "incoming_connection",
              fromId: fromNormalized,
              rawFromId: data.fromId || data.senderId || peerId,
              fromAlias: data.fromAlias || data.requesterName || `Client (${fromNormalized})`,
              fromDevice: data.fromDevice || data.requesterDevice || "Remote Client",
              requestType: data.requestType || "full_control",
              requiresPassword: !!targetHost.unattendedPassword,
              providedPassword: data.providedPassword
            }));
          } else {
            console.warn(`[WS] Target '${targetQuery}' (normalized: '${normalizeDeskId(targetQuery)}') not found among ${activeClients.size} active clients.`);
            ws.send(JSON.stringify({
              type: "connect_error",
              message: `کامپیوتر مقصد با شناسه ${targetQuery} هم‌اکنون در سرور آنلاین نیست. اطمینان حاصل کنید مه دسک در سیستم مقصد باز بوده و چراغ وضعیت آن سبز است.`
            }));
          }
          break;
        }

        // Host accepts or rejects connection
        case "connect_response": {
          const targetQuery = data.toId;
          const viewer = findActiveClient(targetQuery);
          const fromHostNormalized = normalizeDeskId(data.hostId || peerId);
          
          console.log(`[WS] Connect response from host '${fromHostNormalized}' for viewer '${targetQuery}': accepted=${data.accepted}`);

          if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
            viewer.ws.send(JSON.stringify({
              type: "connection_result",
              accepted: data.accepted,
              permissions: data.permissions,
              reason: data.reason
            }));

            if (data.accepted) {
              const hostId = fromHostNormalized;
              const viewerId = normalizeDeskId(data.toId);
              if (!rooms.has(hostId)) {
                rooms.set(hostId, new Set());
              }
              rooms.get(hostId)?.add(viewerId);
            }
          }
          break;
        }

        // WebRTC Signaling: Offer, Answer, ICE candidate, remote input & data forwarding
        case "signal_offer":
        case "signal_answer":
        case "signal_ice":
        case "remote_input":
        case "clipboard_sync":
        case "file_meta":
        case "file_chunk":
        case "whiteboard_draw":
        case "chat_message":
        case "session_control": {
          const target = findActiveClient(data.targetId || data.toId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              ...data,
              senderId: normalizeDeskId(data.senderId || peerId)
            }));
          }
          break;
        }

        case "ping": {
          ws.send(JSON.stringify({ type: "pong", time: Date.now() }));
          break;
        }
      }
    } catch (err) {
      console.error("WS error:", err);
    }
  });

  ws.on("close", () => {
    if (peerId) {
      console.log(`[WS] Socket closed event for: ${peerId}`);
      const current = activeClients.get(peerId);
      // PRESERVE NEW ACTIVE CONNECTION: only delete if the closed socket matches the stored one
      if (current && current.ws === ws) {
        console.log(`[WS] Removing active client entry: ${peerId}`);
        activeClients.delete(peerId);
        rooms.delete(peerId);
        for (const [hostId, viewers] of rooms.entries()) {
          if (viewers.has(peerId)) {
            viewers.delete(peerId);
            const host = findActiveClient(hostId);
            if (host && host.ws.readyState === WebSocket.OPEN) {
              host.ws.send(JSON.stringify({
                type: "viewer_disconnected",
                viewerId: peerId
              }));
            }
          }
        }
      } else {
        console.log(`[WS] Stale socket closed for: ${peerId}, active client preserved`);
      }
    }
  });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`AnyDesk Remote Server running on http://localhost:${PORT}`);
  });
}

start();
