import { Device, RemoteFile } from '../types';

export const INITIAL_COMPANY_DEVICES: Device[] = [
  {
    id: '489 312 905',
    name: 'کامپیوتر واحد حسابداری ۱ (Accounting-PC)',
    alias: 'acc-tehran-01@desk',
    department: 'حسابداری و مالی',
    location: 'دفتر مرکزی تهران - طبقه ۳',
    os: 'windows',
    status: 'online',
    ip: '192.168.1.104',
    lastSeen: 'هم اکنون آنلاین',
    unattendedAccess: true,
    unattendedPassword: 'admin',
    specs: {
      cpu: 'Intel Core i7-12700 (12 Cores)',
      ram: '32 GB DDR4',
      storage: '1 TB NVMe SSD (420 GB Free)',
      resolution: '1920x1080 @ 60Hz',
      monitorsCount: 2,
      osVersion: 'Windows 11 Pro 23H2'
    },
    isFavorite: true
  },
  {
    id: '812 654 290',
    name: 'سرور دیتابیس و پشتیبان (DB-Server-Ubuntu)',
    alias: 'srv-db-backup@desk',
    department: 'زیرساخت و IT',
    location: 'اتاق سرور مرکزی - رک ۴',
    os: 'linux',
    status: 'online',
    ip: '10.0.0.15',
    lastSeen: 'هم اکنون آنلاین',
    unattendedAccess: true,
    unattendedPassword: 'root',
    specs: {
      cpu: 'AMD EPYC 7742 (64 Cores)',
      ram: '128 GB ECC RAM',
      storage: '8 TB RAID 10',
      resolution: '1920x1080 (Headless GUI)',
      monitorsCount: 1,
      osVersion: 'Ubuntu Server 22.04 LTS'
    },
    isFavorite: true
  },
  {
    id: '309 441 876',
    name: 'سیستم گرافیک و طراحی (Design-MacStudio)',
    alias: 'design-studio-mac@desk',
    department: 'مارکتینگ و برند',
    location: 'دفتر مرکزی تهران - آتلیه',
    os: 'macos',
    status: 'online',
    ip: '192.168.1.188',
    lastSeen: 'هم اکنون آنلاین',
    unattendedAccess: true,
    unattendedPassword: 'apple',
    specs: {
      cpu: 'Apple M2 Ultra (24 Core CPU, 60 Core GPU)',
      ram: '64 GB Unified',
      storage: '2 TB SSD',
      resolution: '2560x1440 5K Retina',
      monitorsCount: 2,
      osVersion: 'macOS Sonoma 14.5'
    },
    isFavorite: false
  },
  {
    id: '725 903 148',
    name: 'کامپیوتر مدیریت فروش شعبه اصفهان (Isfahan-Sales-01)',
    alias: 'isfahan-sales@desk',
    department: 'فروش و شعب',
    location: 'شعبه اصفهان - چهارباغ',
    os: 'windows',
    status: 'online',
    ip: '192.168.10.45',
    lastSeen: 'هم اکنون آنلاین',
    unattendedAccess: true,
    unattendedPassword: 'sales',
    specs: {
      cpu: 'Intel Core i5-11400',
      ram: '16 GB DDR4',
      storage: '512 GB SSD',
      resolution: '1920x1080',
      monitorsCount: 1,
      osVersion: 'Windows 10 Enterprise'
    },
    isFavorite: true
  },
  {
    id: '154 892 630',
    name: 'لپ‌تاپ پشتیبانی فنی و مانیتورینگ (IT-Support-Mobile)',
    alias: 'it-support-laptop@desk',
    department: 'زیرساخت و IT',
    location: 'واحد هلپ‌دسک',
    os: 'windows',
    status: 'busy',
    ip: '192.168.1.120',
    lastSeen: 'در حال مکالمه / نشست ریموت',
    unattendedAccess: false,
    specs: {
      cpu: 'AMD Ryzen 7 5800H',
      ram: '16 GB DDR4',
      storage: '1 TB SSD',
      resolution: '1920x1080',
      monitorsCount: 1,
      osVersion: 'Windows 11 Pro'
    },
    isFavorite: false
  },
  {
    id: '993 118 402',
    name: 'سرور اتوماسیون اداری شعبه تبریز (Tabriz-Branch-Automation)',
    alias: 'tabriz-branch@desk',
    department: 'اداری و دبیرخانه',
    location: 'شعبه تبریز - ولیعصر',
    os: 'windows',
    status: 'offline',
    ip: '192.168.20.10',
    lastSeen: '۲ ساعت پیش (امکان روشن کردن با Wake-on-LAN)',
    unattendedAccess: true,
    unattendedPassword: 'admin',
    specs: {
      cpu: 'Intel Xeon E-2224',
      ram: '32 GB ECC',
      storage: '2 TB Enterprise',
      resolution: '1440x900',
      monitorsCount: 1,
      osVersion: 'Windows Server 2022'
    },
    isFavorite: false
  }
];

export const INITIAL_REMOTE_FILES: RemoteFile[] = [
  { name: 'اسناد مالی و فاکتورهای ۱۴۰۳', path: 'C:/Accounting/Invoices_1403', size: 0, isDir: true, modified: '1403/06/15 10:30', type: 'Folder' },
  { name: 'گزارش سود و زیان ماهانه.xlsx', path: 'C:/Accounting/Monthly_Profit_Loss.xlsx', size: 2450000, isDir: false, modified: '1403/06/20 16:45', type: 'Excel Spreadsheet', extension: 'xlsx' },
  { name: 'لیست حقوق و دستمزد پرسنل.xlsx', path: 'C:/Accounting/Payroll_Staff.xlsx', size: 1820000, isDir: false, modified: '1403/06/22 09:12', type: 'Excel Spreadsheet', extension: 'xlsx' },
  { name: 'قرارداد همکاری تجاری شعب.pdf', path: 'C:/Documents/Partnership_Contracts.pdf', size: 4890000, isDir: false, modified: '1403/06/18 14:20', type: 'PDF Document', extension: 'pdf' },
  { name: 'پشتیبان دیتابیس نرم افزار سپیدار.bak', path: 'D:/Backups/Sepidar_DB_Backup_2026.bak', size: 450000000, isDir: false, modified: '1403/06/24 02:00', type: 'Database Backup', extension: 'bak' },
  { name: 'نرم افزار AnyDesk_Enterprise_v8.exe', path: 'C:/Downloads/AnyDesk_Enterprise_v8.exe', size: 12500000, isDir: false, modified: '1403/06/10 11:00', type: 'Executable Application', extension: 'exe' },
  { name: 'اسکریپت بروزرسانی خودکار سرور.ps1', path: 'C:/Scripts/Auto_Update_Server.ps1', size: 15400, isDir: false, modified: '1403/06/23 18:30', type: 'PowerShell Script', extension: 'ps1' },
  { name: 'لاگ خطاهای شبکه و دیواره آتش.log', path: 'C:/Logs/firewall_security.log', size: 580000, isDir: false, modified: '1403/06/24 11:15', type: 'Log File', extension: 'log' },
  { name: 'طرح معماری شبکه شرکت.png', path: 'C:/Pictures/Office_Network_Topology.png', size: 3400000, isDir: false, modified: '1403/05/29 15:10', type: 'PNG Image', extension: 'png' }
];

export const INITIAL_LOCAL_FILES: RemoteFile[] = [
  { name: 'پوشه دانلودها (Downloads)', path: 'Local/Downloads', size: 0, isDir: true, modified: '1403/06/24 11:00', type: 'Folder' },
  { name: 'فایل آپدیت آنتی ویروس.zip', path: 'Local/Downloads/Antivirus_Definitions_Update.zip', size: 85000000, isDir: false, modified: '1403/06/24 08:30', type: 'ZIP Archive', extension: 'zip' },
  { name: 'پچ امنیتی ویندوز ۱۱.msu', path: 'Local/Downloads/Windows11_Security_Patch_KB503.msu', size: 140000000, isDir: false, modified: '1403/06/23 12:00', type: 'Windows Update Package', extension: 'msu' },
  { name: 'فرم درخواست دسترسی ریموت.docx', path: 'Local/Documents/Remote_Access_Request.docx', size: 280000, isDir: false, modified: '1403/06/20 14:00', type: 'Word Document', extension: 'docx' },
  { name: 'کلید گواهی SSL سرور.crt', path: 'Local/Certs/office_internal_ssl.crt', size: 4200, isDir: false, modified: '1403/06/19 10:15', type: 'Security Certificate', extension: 'crt' }
];
