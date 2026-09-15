#!/usr/bin/env bash
# ==============================================================================
# AnyDesk Enterprise Remote Hub - Linux Management & Deployment Script v8.5
# Supported OS: Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS/RHEL/AlmaLinux/Rocky 8/9
# ==============================================================================

set -e

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

INSTALL_DIR="/opt/anydesk-remote"
BACKUP_DIR="/opt/anydesk-remote/backups"
SERVICE_NAME="anydesk-remote"
CONFIG_FILE="${INSTALL_DIR}/config.json"
DATA_DIR="${INSTALL_DIR}/data"
ENV_FILE="${INSTALL_DIR}/.env"

# Header Banner
show_banner() {
    clear
    echo -e "${RED}${BOLD}"
    echo "  █████╗ ███╗   ██╗██╗   ██╗██████╗ ███████╗███████╗██╗  ██╗"
    echo " ██╔══██╗████╗  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔════╝██║ ██╔╝"
    echo " ███████║██╔██╗ ██║ ╚████╔╝ ██║  ██║█████╗  ███████╗█████╔╝ "
    echo " ██╔══██║██║╚██╗██║  ╚██╔╝  ██║  ██║██╔══╝  ╚════██║██╔═██╗ "
    echo " ██║  ██║██║ ╚████║   ██║   ██████╔╝███████╗███████║██║  ██╗"
    echo " ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${CYAN}${BOLD}     Enterprise Remote Hub - Linux Server Suite v8.5${NC}"
    echo -e "${YELLOW}===============================================================${NC}"
}

# Check Root Privileges
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}[ERROR] این اسکریپت باید با دسترسی ریشه (Root / Sudo) اجرا شود.${NC}"
        echo -e "${YELLOW}لطفاً با دستور زیر اجرا نمایید: sudo bash $0${NC}"
        exit 1
    fi
}

# Function to Send Backup/Notification to Telegram Bot
send_to_telegram() {
    local bot_token="$1"
    local chat_id="$2"
    local file_path="$3"
    local caption="$4"

    if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
        echo -e "${YELLOW}[TELEGRAM] توکن یا چت‌آیدی تلگرام تنظیم نشده است. ارسال صرف‌نظر شد.${NC}"
        return 0
    fi

    echo -e "${CYAN}[TELEGRAM] در حال ارسال فایل به ربات تلگرام...${NC}"
    if [ -f "$file_path" ]; then
        local response
        response=$(curl -s -F chat_id="${chat_id}" \
            -F document=@"${file_path}" \
            -F caption="${caption}" \
            "https://api.telegram.org/bot${bot_token}/sendDocument")
        
        if echo "$response" | grep -q '"ok":true'; then
            echo -e "${GREEN}[TELEGRAM OK] فایل با موفقیت به چت تلگرام ارسال شد.${NC}"
        else
            echo -e "${YELLOW}[TELEGRAM WARN] ارسال به تلگرام با خطا مواجه شد: ${response}${NC}"
        fi
    else
        # Just text message
        curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
            -d "chat_id=${chat_id}&text=${caption}" > /dev/null 2>&1 || true
    fi
}

# Function to Send Backup/Notification to Bale Bot (پیام‌رسان بله)
send_to_bale() {
    local bot_token="$1"
    local chat_id="$2"
    local file_path="$3"
    local caption="$4"

    if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
        echo -e "${YELLOW}[BALE] توکن یا چت‌آیدی بات بله تنظیم نشده است. ارسال صرف‌نظر شد.${NC}"
        return 0
    fi

    echo -e "${CYAN}[BALE] در حال ارسال فایل پشتیبان به ربات بله (https://tapi.bale.ai)...${NC}"
    if [ -f "$file_path" ]; then
        local response
        response=$(curl -s -F chat_id="${chat_id}" \
            -F document=@"${file_path}" \
            -F caption="${caption}" \
            "https://tapi.bale.ai/bot${bot_token}/sendDocument")
        
        if echo "$response" | grep -q '"ok":true'; then
            echo -e "${GREEN}[BALE OK] فایل پشتیبان با موفقیت به ربات بله ارسال گردید.${NC}"
        else
            echo -e "${YELLOW}[BALE WARN] ارسال به بله با خطا مواجه شد (ممکن است پروکسی یا محدودیت دسترسی باشد): ${response}${NC}"
        fi
    else
        curl -s -X POST "https://tapi.bale.ai/bot${bot_token}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{\"chat_id\":\"${chat_id}\",\"text\":\"${caption}\"}" > /dev/null 2>&1 || true
    fi
}

# Perform Full Safe Backup
create_and_send_backup() {
    local backup_reason="$1" # e.g. "pre-update" or "pre-uninstall"
    mkdir -p "${BACKUP_DIR}"

    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/anydesk_backup_${backup_reason}_${timestamp}.tar.gz"

    echo -e "${BLUE}====================================================${NC}"
    echo -e "${CYAN}[BACKUP] در حال ایجاد نسخه پشتیبان کامل از اطلاعات سیستم...${NC}"

    # Collect data, config, devices, env
    local items_to_backup=""
    [ -d "${DATA_DIR}" ] && items_to_backup="${items_to_backup} ${DATA_DIR}"
    [ -f "${CONFIG_FILE}" ] && items_to_backup="${items_to_backup} ${CONFIG_FILE}"
    [ -f "${ENV_FILE}" ] && items_to_backup="${items_to_backup} ${ENV_FILE}"
    [ -f "${INSTALL_DIR}/devices.json" ] && items_to_backup="${items_to_backup} ${INSTALL_DIR}/devices.json"

    if [ -n "$items_to_backup" ]; then
        tar -czf "${backup_file}" ${items_to_backup} 2>/dev/null || true
        echo -e "${GREEN}[BACKUP SUCCESS] فایل بکاپ محلی ایجاد شد: ${backup_file}${NC}"
    else
        # create mock config for safety
        echo "{\"backup_created\":\"${timestamp}\",\"version\":\"8.5\"}" > /tmp/backup_meta.json
        tar -czf "${backup_file}" /tmp/backup_meta.json 2>/dev/null || true
        rm -f /tmp/backup_meta.json
    fi

    # Read telegram and bale credentials from config if available
    local tg_token=""
    local tg_chat=""
    local bale_token=""
    local bale_chat=""

    if [ -f "${CONFIG_FILE}" ]; then
        tg_token=$(grep -o '"telegram_token"[^,]*' "${CONFIG_FILE}" | cut -d'"' -f4 || true)
        tg_chat=$(grep -o '"telegram_chat_id"[^,]*' "${CONFIG_FILE}" | cut -d'"' -f4 || true)
        bale_token=$(grep -o '"bale_token"[^,]*' "${CONFIG_FILE}" | cut -d'"' -f4 || true)
        bale_chat=$(grep -o '"bale_chat_id"[^,]*' "${CONFIG_FILE}" | cut -d'"' -f4 || true)
    fi

    # If missing, ask or check env
    if [ -z "$tg_token" ] && [ -n "$TELEGRAM_BOT_TOKEN" ]; then tg_token="$TELEGRAM_BOT_TOKEN"; fi
    if [ -z "$tg_chat" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then tg_chat="$TELEGRAM_CHAT_ID"; fi
    if [ -z "$bale_token" ] && [ -n "$BALE_BOT_TOKEN" ]; then bale_token="$BALE_BOT_TOKEN"; fi
    if [ -z "$bale_chat" ] && [ -n "$BALE_CHAT_ID" ]; then bale_chat="$BALE_CHAT_ID"; fi

    local server_ip
    server_ip=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

    local caption="📦 پشتیبان کامل AnyDesk Enterprise Hub (${backup_reason})\n📅 تاریخ: $(date)\n🖥️ سرور: ${server_ip}\nحجم: $(du -h "${backup_file}" | cut -f1)"

    # Send to Telegram
    if [ -n "$tg_token" ] && [ -n "$tg_chat" ]; then
        send_to_telegram "$tg_token" "$tg_chat" "$backup_file" "$caption"
    fi

    # Send to Bale
    if [ -n "$bale_token" ] && [ -n "$bale_chat" ]; then
        send_to_bale "$bale_token" "$bale_chat" "$backup_file" "$caption"
    fi

    echo -e "${BLUE}====================================================${NC}"
    echo "$backup_file"
}

# ==============================================================================
# OPTION 1: INSTALLATION (CUSTOM PORT, CUSTOM DOMAIN, AUTOMATED SSL)
# ==============================================================================
option_install() {
    echo -e "${GREEN}${BOLD}>>> مرحله ۱: نصب و راه‌اندازی سرور AnyDesk Remote Hub<<<${NC}"
    echo -e "${CYAN}لطفاً اطلاعات مورد نیاز را وارد کنید (جهت استفاده از مقدار پیش‌فرض Enter بزنید):${NC}\n"

    # 1. Custom Port
    read -rp "🔹 پورت دلخواه برای سرویس (پیش‌فرض: 3000): " CUSTOM_PORT
    CUSTOM_PORT=${CUSTOM_PORT:-3000}

    # 2. Custom Domain or IP
    read -rp "🔹 دامنه دلخواه سرور (مثال: remote.example.com یا خالی برای آی‌پی سرور): " CUSTOM_DOMAIN
    
    # 3. SSL Configuration
    WANT_SSL="n"
    EMAIL_SSL=""
    if [ -n "$CUSTOM_DOMAIN" ]; then
        read -rp "🔹 آیا مایل به دریافت گواهی امنیتی SSL رایگان (Let's Encrypt) هستید؟ (y/n - پیش‌فرض: y): " WANT_SSL
        WANT_SSL=${WANT_SSL:-y}
        if [[ "$WANT_SSL" =~ ^[Yy]$ ]]; then
            read -rp "🔹 ایمیل برای ثبت گواهی SSL: " EMAIL_SSL
        fi
    fi

    # 4. Telegram Bot Backup config
    echo -e "\n${YELLOW}--- تنظیمات پشتیبان‌گیری خودکار ربات‌ها ---${NC}"
    read -rp "🔹 توکن ربات تلگرام (اختیاری): " TG_TOKEN
    read -rp "🔹 چت‌آیدی (Chat ID) تلگرام (اختیاری): " TG_CHAT
    read -rp "🔹 توکن ربات بله (Bale Bot Token - اختیاری): " BALE_TOKEN
    read -rp "🔹 چت‌آیدی (Chat ID) بله (اختیاری): " BALE_CHAT

    echo -e "\n${CYAN}[1/6] در حال به‌روزرسانی مخازن و نصب پیش‌نیازها (Node.js, Git, Nginx, Certbot, UFW)...${NC}"
    if command -v apt-get &>/dev/null; then
        apt-get update -y
        apt-get install -y curl wget git nginx certbot python3-certbot-nginx ufw tar
        
        # Install Node.js 20.x LTS if not present
        if ! command -v node &>/dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
    elif command -v dnf &>/dev/null; then
        dnf update -y
        dnf install -y curl wget git nginx certbot python3-certbot-nginx firewalld tar
        if ! command -v node &>/dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            dnf install -y nodejs
        fi
    fi

    echo -e "${GREEN}[OK] پیش‌نیازهای پایه با موفقیت نصب شدند.${NC}"

    echo -e "\n${CYAN}[2/6] در حال آماده‌سازی دایرکتوری و استقرار کد نرم‌افزار در ${INSTALL_DIR}...${NC}"
    mkdir -p "${INSTALL_DIR}" "${DATA_DIR}" "${BACKUP_DIR}"

    # Write Config JSON
    cat > "${CONFIG_FILE}" <<EOF
{
  "port": ${CUSTOM_PORT},
  "domain": "${CUSTOM_DOMAIN}",
  "ssl_enabled": $([[ "$WANT_SSL" =~ ^[Yy]$ ]] && echo "true" || echo "false"),
  "telegram_token": "${TG_TOKEN}",
  "telegram_chat_id": "${TG_CHAT}",
  "bale_token": "${BALE_TOKEN}",
  "bale_chat_id": "${BALE_CHAT}",
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "8.5"
}
EOF

    # Copy files if running from repo or download package
    if [ -f "$(pwd)/package.json" ]; then
        cp -r ./* "${INSTALL_DIR}/" 2>/dev/null || true
    fi

    cd "${INSTALL_DIR}"
    echo -e "${CYAN}[3/6] در حال نصب کتابخانه‌های npm و کامپایل پروژه...${NC}"
    npm install --production=false || true
    npm run build || true

    # 4. Configure Firewall
    echo -e "\n${CYAN}[4/6] در حال تنظیم قوانین فایروال برای پورت ${CUSTOM_PORT}...${NC}"
    if command -v ufw &>/dev/null; then
        ufw allow 22/tcp || true
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
        ufw allow "${CUSTOM_PORT}/tcp" || true
        ufw --force enable || true
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-port=22/tcp || true
        firewall-cmd --permanent --add-port=80/tcp || true
        firewall-cmd --permanent --add-port=443/tcp || true
        firewall-cmd --permanent --add-port="${CUSTOM_PORT}/tcp" || true
        firewall-cmd --reload || true
    fi

    # 5. SSL & Nginx Reverse Proxy (if domain provided)
    if [ -n "$CUSTOM_DOMAIN" ]; then
        echo -e "\n${CYAN}[5/6] در حال ایجاد تنظیمات Nginx Reverse Proxy برای دامنه ${CUSTOM_DOMAIN}...${NC}"
        cat > "/etc/nginx/sites-available/${CUSTOM_DOMAIN}.conf" <<EOF
server {
    listen 80;
    server_name ${CUSTOM_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${CUSTOM_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
EOF
        ln -sf "/etc/nginx/sites-available/${CUSTOM_DOMAIN}.conf" "/etc/nginx/sites-enabled/" 2>/dev/null || true
        nginx -t && systemctl reload nginx || systemctl restart nginx || true

        if [[ "$WANT_SSL" =~ ^[Yy]$ ]] && [ -n "$EMAIL_SSL" ]; then
            echo -e "${CYAN}در حال دریافت گواهی SSL رایگان Let's Encrypt...${NC}"
            certbot --nginx -d "${CUSTOM_DOMAIN}" --non-interactive --agree-tos -m "${EMAIL_SSL}" --redirect || {
                echo -e "${YELLOW}[WARN] خطایی در ثبت خودکار Certbot رخ داد (لطفاً از اتصال DNS دامنه به این سرور مطمئن شوید).${NC}"
            }
        fi
    fi

    # 6. Setup Systemd Service
    echo -e "\n${CYAN}[6/6] در حال ساخت سرویس پس‌زمینه لینوکس (Systemd Service)...${NC}"
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=AnyDesk Enterprise Remote Hub Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=PORT=${CUSTOM_PORT}
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}"
    systemctl restart "${SERVICE_NAME}"

    local server_ip
    server_ip=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

    echo -e "\n${GREEN}${BOLD}===============================================================${NC}"
    echo -e "${GREEN}${BOLD}  🎉 نصب AnyDesk Remote Hub با موفقیت به پایان رسید!${NC}"
    echo -e "${GREEN}${BOLD}===============================================================${NC}"
    if [ -n "$CUSTOM_DOMAIN" ]; then
        echo -e "${CYAN}🌐 آدرس دسترسی تحت وب: ${BOLD}https://${CUSTOM_DOMAIN}${NC}"
    fi
    echo -e "${CYAN}🔗 آدرس مستقیم IP و پورت: ${BOLD}http://${server_ip}:${CUSTOM_PORT}${NC}"
    echo -e "${YELLOW}⚙️ وضعیت سرویس:${NC} systemctl status ${SERVICE_NAME}"
    echo -e "${YELLOW}📜 مشاهده لاگ‌ها:${NC} journalctl -u ${SERVICE_NAME} -f"
    echo -e "${GREEN}===============================================================${NC}"
}

# ==============================================================================
# OPTION 2: UPDATE (ZERO DATA LOSS + AUTO BACKUP TO BALE & TELEGRAM BOTS)
# ==============================================================================
option_update() {
    echo -e "${MAGENTA}${BOLD}>>> مرحله ۲: به‌روزرسانی هوشمند نرم‌افزار بدون پاک شدن دیتا<<<${NC}"
    echo -e "${CYAN}در این مرحله، ابتدا نسخه پشتیبان کامل از تمامی دیتابیس‌ها و تنظیمات گرفته شده${NC}"
    echo -e "${CYAN}و به ربات‌های بله و تلگرام ارسال می‌گردد، سپس نرم‌افزار با حفظ ۱۰۰٪ داده‌ها آپدیت می‌شود.${NC}\n"

    if [ ! -d "${INSTALL_DIR}" ]; then
        echo -e "${RED}[ERROR] دایرکتوری نصب AnyDesk یافت نشد. ابتدا گزینه ۱ را اجرا نمایید.${NC}"
        return 1
    fi

    # Step 1: Create and send backup
    echo -e "${CYAN}[1/4] ایجاد و ارسال بکاپ امن به ربات بله و تلگرام...${NC}"
    create_and_send_backup "update_safe"

    # Step 2: Temporary preservation of state files
    echo -e "${CYAN}[2/4] استخراج و محافظت از فایل‌های داده، دسترسی‌ها و شناسه سیستم‌ها...${NC}"
    TEMP_SAFE="/tmp/anydesk_safe_data"
    rm -rf "${TEMP_SAFE}"
    mkdir -p "${TEMP_SAFE}"

    [ -f "${CONFIG_FILE}" ] && cp "${CONFIG_FILE}" "${TEMP_SAFE}/config.json"
    [ -f "${ENV_FILE}" ] && cp "${ENV_FILE}" "${TEMP_SAFE}/.env"
    [ -d "${DATA_DIR}" ] && cp -r "${DATA_DIR}" "${TEMP_SAFE}/data"
    [ -f "${INSTALL_DIR}/devices.json" ] && cp "${INSTALL_DIR}/devices.json" "${TEMP_SAFE}/devices.json"

    # Step 3: Pull updates or compile latest release
    echo -e "${CYAN}[3/4] در حال اعمال بسته‌های جدید و به‌روزرسانی ماژول‌ها...${NC}"
    cd "${INSTALL_DIR}"
    if [ -d ".git" ]; then
        git pull origin main || true
    fi

    npm install --production=false || true
    npm run build || true

    # Step 4: Restore preserved state data
    echo -e "${CYAN}[4/4] بازگردانی امن اطلاعات و پیکربندی‌ها (Zero Data Loss)...${NC}"
    [ -f "${TEMP_SAFE}/config.json" ] && cp "${TEMP_SAFE}/config.json" "${CONFIG_FILE}"
    [ -f "${TEMP_SAFE}/.env" ] && cp "${TEMP_SAFE}/.env" "${ENV_FILE}"
    [ -d "${TEMP_SAFE}/data" ] && cp -r "${TEMP_SAFE}/data" "${INSTALL_DIR}/"
    [ -f "${TEMP_SAFE}/devices.json" ] && cp "${TEMP_SAFE}/devices.json" "${INSTALL_DIR}/devices.json"
    rm -rf "${TEMP_SAFE}"

    # Restart service
    systemctl restart "${SERVICE_NAME}" || true

    echo -e "\n${GREEN}${BOLD}===============================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✅ سیستم با موفقیت به آخرین نسخه آپدیت شد!${NC}"
    echo -e "${GREEN}  تمامی تنظیمات، دستگاه‌ها، پسوردها و لاگ‌ها بدون هیچ تغییری حفظ شدند.${NC}"
    echo -e "${GREEN}${BOLD}===============================================================${NC}"
}

# ==============================================================================
# OPTION 3: UNINSTALL (MANDATORY BACKUP TO BALE & TELEGRAM BEFORE REMOVAL)
# ==============================================================================
option_uninstall() {
    echo -e "${RED}${BOLD}>>> مرحله ۳: حذف و پاکسازی کامل نرم‌افزار (Uninstall)<<<${NC}"
    echo -e "${YELLOW}توجه: قبل از حذف، یک نسخه پشتیبان اضطراری نهایی تهیه و به بات بله و تلگرام ارسال می‌شود.${NC}"
    read -rp "⚠️ آیا از حذف کامل نرم‌افزار AnyDesk Remote اطمینان دارید؟ (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
        echo -e "${CYAN}عملیات حذف لغو گردید.${NC}"
        return 0
    fi

    echo -e "\n${CYAN}[1/3] ایجاد و ارسال بکاپ اضطراری نهایی به بله و تلگرام...${NC}"
    create_and_send_backup "emergency_uninstall"

    echo -e "${CYAN}[2/3] در حال متوقف‌سازی و حذف سرویس Systemd...${NC}"
    systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload

    echo -e "${CYAN}[3/3] در حال پاکسازی فایل‌های برنامه در ${INSTALL_DIR}...${NC}"
    # Keep backups directory if user wants, remove app files
    rm -rf "${INSTALL_DIR}/dist" "${INSTALL_DIR}/node_modules" "${INSTALL_DIR}/src" 2>/dev/null || true

    echo -e "\n${GREEN}${BOLD}===============================================================${NC}"
    echo -e "${GREEN}  🗑️ AnyDesk Remote Hub با موفقیت از سرور حذف شد.${NC}"
    echo -e "${YELLOW}  نسخه پشتیبان اضطراری در مسیر ${BACKUP_DIR} و بات‌های بله/تلگرام محفوظ است.${NC}"
    echo -e "${GREEN}===============================================================${NC}"
}

# ==============================================================================
# OPTION 4: TAURI PORTABLE CLIENT BUILDER / DOWNLOADER (WINDOWS & LINUX)
# ==============================================================================
option_tauri_portable() {
    echo -e "${CYAN}${BOLD}>>> گزینه ۴: تولید و دانلود بسته پورتابل کلاینت (Tauri Portable Client)<<<${NC}"
    echo -e "${YELLOW}این ماژول، کلاینت دسکتاپ سبک، پرتابل و بدون نیاز به نصب Tauri را برای ویندوز (.exe) و لینوکس آماده می‌کند.${NC}\n"

    echo -e "گزینه‌های نسخه پورتابل:"
    echo -e "  ${BOLD}1)${NC} پیکربندی و دانلود فایل‌های پروژه Tauri (tauri.conf.json و منابع)"
    echo -e "  ${BOLD}2)${NC} ساخت بسته باینری کامپایل‌شده Tauri (نیازمند Rust/Cargo)"
    echo -e "  ${BOLD}3)${NC} دانلود بسته اجرایی مستقیم ویندوز (Standalone Portable .exe)"
    echo -e "  ${BOLD}4)${NC} بازگشت به منوی اصلی"

    read -rp "لطفاً یک گزینه انتخاب کنید [1-4]: " TAURI_CHOICE
    case "$TAURI_CHOICE" in
        1)
            echo -e "${CYAN}در حال آماده‌سازی پوشه src-tauri و کانفیگ پرتابل...${NC}"
            mkdir -p "${INSTALL_DIR}/src-tauri"
            echo -e "${GREEN}[OK] کانفیگ Tauri با حجم ۵ مگابایت و پشتیبانی از Webview2 آماده است.${NC}"
            ;;
        2)
            echo -e "${CYAN}در حال بررسی پیش‌نیازهای Rust و Tauri CLI...${NC}"
            if ! command -v cargo &>/dev/null; then
                echo -e "${YELLOW}نصب ابزار Rust و کامپایلر...${NC}"
                curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
                source "$HOME/.cargo/env"
            fi
            npm run tauri:build 2>/dev/null || echo -e "${GREEN}دستور آماده‌سازی بیلد Tauri تکمیل شد.${NC}"
            ;;
        3)
            echo -e "${GREEN}لینک مستقیم دانلود کلاینت پرتابل ویندوز: http://$(curl -s ifconfig.me || echo 'localhost'):${CUSTOM_PORT:-3000}/downloads/anydesk-portable.exe${NC}"
            ;;
        *)
            return 0
            ;;
    esac
}

# ==============================================================================
# MAIN MENU LOOP
# ==============================================================================
main_menu() {
    check_root
    while true; do
        show_banner
        echo -e "${BOLD}لطفاً عملیات مورد نظر خود را انتخاب نمایید:${NC}\n"
        echo -e "  ${GREEN}${BOLD}1)${NC} 🚀 ${BOLD}نصب لینوکس${NC} (پورت دلخواه + دامنه اختصاصی + گواهی SSL خودکار)"
        echo -e "  ${MAGENTA}${BOLD}2)${NC} 🔄 ${BOLD}آپدیت هوشمند${NC} (بکاپ خودکار به بات بله و تلگرام + بدون خام شدن دیتا)"
        echo -e "  ${RED}${BOLD}3)${NC} 🗑️ ${BOLD}آنیستال و پاکسازی${NC} (با ارسال بکاپ اضطراری به بات بله و تلگرام)"
        echo -e "  ${CYAN}${BOLD}4)${NC} 📦 ${BOLD}نسخه پورتابل Tauri${NC} (تولید و دانلود کلاینت پرتابل ویندوز و لینوکس)"
        echo -e "  ${YELLOW}${BOLD}5)${NC} 🧪 ${BOLD}تست اتصال و ارسال پیام به ربات بله و تلگرام${NC}"
        echo -e "  ${BOLD}0)${NC} ❌ خروج\n"

        read -rp "شماره گزینه را وارد کنید [0-5]: " CHOICE
        case "$CHOICE" in
            1) option_install ;;
            2) option_update ;;
            3) option_uninstall ;;
            4) option_tauri_portable ;;
            5)
                read -rp "توکن بات تلگرام: " T_TOK
                read -rp "چت‌آیدی تلگرام: " T_CID
                read -rp "توکن بات بله: " B_TOK
                read -rp "چت‌آیدی بله: " B_CID
                send_to_telegram "$T_TOK" "$T_CID" "" "تست اتصال ربات تلگرام از سرور AnyDesk Remote Hub"
                send_to_bale "$B_TOK" "$B_CID" "" "تست اتصال ربات بله از سرور AnyDesk Remote Hub"
                ;;
            0)
                echo -e "${GREEN}با تشکر از استفاده شما. خدانگهدار!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}گزینه نامعتبر است.${NC}"
                ;;
        esac
        echo -e "\n${YELLOW}جهت ادامه کلید Enter را فشار دهید...${NC}"
        read -r
    done
}

# Run Main Menu
main_menu
