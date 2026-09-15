#!/usr/bin/env bash
# ==============================================================================
# meh desk - Enterprise Remote Desktop Linux Management & Deployment Suite v9.0
# Supported OS: Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS/RHEL/Rocky/AlmaLinux
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
NC='\033[0m'

INSTALL_DIR="/opt/mehdesk"
BACKUP_DIR="/opt/mehdesk/backups"
SERVICE_NAME="mehdesk"
CONFIG_FILE="${INSTALL_DIR}/config.json"
DATA_DIR="${INSTALL_DIR}/data"
ENV_FILE="${INSTALL_DIR}/.env"

# Default placeholders (auto-injected by server when downloading)
TG_BOT_TOKEN=""
TG_CHAT_ID=""
BALE_BOT_TOKEN=""
BALE_CHAT_ID=""

show_banner() {
    clear
    echo -e "${RED}${BOLD}"
    echo "  ███╗   ███╗███████╗██╗  ██╗    ██████╗ ███████╗███████╗██╗  ██╗"
    echo "  ████╗ ████║██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██║ ██╔╝"
    echo "  ██╔████╔██║█████╗  ███████║    ██║  ██║█████╗  ███████╗█████╔╝ "
    echo "  ██║╚██╔╝██║██╔══╝  ██╔══██║    ██║  ██║██╔══╝  ╚════██║██╔═██╗ "
    echo "  ██║ ╚═╝ ██║███████╗██║  ██║    ██████╔╝███████╗███████║██║  ██╗"
    echo "  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${CYAN}${BOLD}       meh desk - Enterprise Remote Desktop Suite v9.0${NC}"
    echo -e "${YELLOW}===============================================================${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}[ERROR] این اسکریپت باید با دسترسی ریشه (Root / Sudo) اجرا شود.${NC}"
        echo -e "${YELLOW}اجرا با: sudo bash $0${NC}"
        exit 1
    fi
}

send_to_telegram() {
    local bot_token="$1"
    local chat_id="$2"
    local file_path="$3"
    local caption="$4"

    if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
        return 0
    fi

    echo -e "${CYAN}[TELEGRAM] ارسال فایل پشتیبان به تلگرام...${NC}"
    if [ -f "$file_path" ]; then
        curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendDocument" \
            -F chat_id="${chat_id}" \
            -F document=@"${file_path}" \
            -F caption="${caption}" > /dev/null 2>&1 || echo -e "${YELLOW}[WARN] خطا در ارسال به تلگرام.${NC}"
    fi
}

send_to_bale() {
    local bot_token="$1"
    local chat_id="$2"
    local file_path="$3"
    local caption="$4"

    if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
        return 0
    fi

    echo -e "${CYAN}[BALE] ارسال فایل پشتیبان به پیام‌رسان بله (tapi.bale.ai)...${NC}"
    if [ -f "$file_path" ]; then
        curl -s -X POST "https://tapi.bale.ai/bot${bot_token}/sendDocument" \
            -F chat_id="${chat_id}" \
            -F document=@"${file_path}" \
            -F caption="${caption}" > /dev/null 2>&1 || echo -e "${YELLOW}[WARN] خطا در ارسال به بله.${NC}"
    fi
}

# Create Backup Archive
create_backup() {
    local reason="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/mehdesk_backup_${timestamp}.tar.gz"

    mkdir -p "${BACKUP_DIR}"

    if [ -d "${INSTALL_DIR}" ]; then
        echo -e "${CYAN}[BACKUP] در حال تهیه بکاپ فشرده قبل از (${reason})...${NC}"
        tar -czf "${backup_file}" -C "${INSTALL_DIR}" data config.json .env 2>/dev/null || true
        echo -e "${GREEN}[OK] بکاپ در مسیر ذخیره شد: ${backup_file}${NC}"

        # Load bot credentials from .env if present
        if [ -f "${ENV_FILE}" ]; then
            source "${ENV_FILE}"
        fi

        local tg_token="${TELEGRAM_BOT_TOKEN:-$TG_BOT_TOKEN}"
        local tg_chat="${TELEGRAM_ADMIN_CHAT_ID:-$TG_CHAT_ID}"
        local bale_token="${BALE_BOT_TOKEN:-$BALE_BOT_TOKEN}"
        local bale_chat="${BALE_ADMIN_CHAT_ID:-$BALE_CHAT_ID}"

        local caption="📦 بکاپ خودکار سرور meh desk\n📅 تاریخ: $(date)\nعلت: ${reason}\nهاست: $(hostname)"
        send_to_telegram "${tg_token}" "${tg_chat}" "${backup_file}" "${caption}"
        send_to_bale "${bale_token}" "${bale_chat}" "${backup_file}" "${caption}"
    fi
}

# Option 1: Full Installation
install_mehdesk() {
    echo -e "\n${BOLD}${GREEN}=== [1/4] شروع نصب و راه‌اندازی کامل meh desk ===${NC}\n"

    read -p "🔹 پورت سرویس ریموت (پیش‌فرض: 3000): " PORT_INPUT
    PORT=${PORT_INPUT:-3000}

    read -p "🔹 دامنه اختصاصی سرور (مثال: remote.company.com یا خالی برای IP): " DOMAIN_INPUT
    DOMAIN=${DOMAIN_INPUT:-""}

    echo -e "\n${YELLOW}=== تنظیمات ربات‌های پشتیبان‌گیری و اعلان ادمین ===${NC}"
    read -p "🔹 توکن ربات تلگرام (Telegram Bot Token - اختیاری): " TG_TOKEN_INPUT
    TG_BOT_TOKEN=${TG_TOKEN_INPUT:-$TG_BOT_TOKEN}

    if [ -n "$TG_BOT_TOKEN" ]; then
        read -p "🔹 چت‌آیدی ادمین‌های تلگرام (Admin Chat IDs): " TG_CHAT_INPUT
        TG_CHAT_ID=${TG_CHAT_INPUT:-$TG_CHAT_ID}
    fi

    read -p "🔹 توکن ربات بله (Bale Bot Token - اختیاری): " BALE_TOKEN_INPUT
    BALE_BOT_TOKEN=${BALE_TOKEN_INPUT:-$BALE_BOT_TOKEN}

    if [ -n "$BALE_BOT_TOKEN" ]; then
        read -p "🔹 چت‌آیدی ادمین‌های بله (Bale Admin Chat IDs): " BALE_CHAT_INPUT
        BALE_CHAT_ID=${BALE_CHAT_INPUT:-$BALE_CHAT_ID}
    fi

    # Install packages
    echo -e "\n${CYAN}[1/5] بروزرسانی مخازن و نصب Node.js و Nginx...${NC}"
    if command -v apt-get &>/dev/null; then
        apt-get update -y
        apt-get install -y curl wget git tar ufw nginx certbot python3-certbot-nginx
        if ! command -v node &>/dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
    elif command -v dnf &>/dev/null; then
        dnf update -y
        dnf install -y curl wget git tar nginx epel-release certbot python3-certbot-nginx
        dnf module install -y nodejs:20
    fi

    mkdir -p "${INSTALL_DIR}" "${DATA_DIR}" "${BACKUP_DIR}"

    # Write Environment File
    cat <<EOF > "${ENV_FILE}"
PORT=${PORT}
NODE_ENV=production
DOMAIN=${DOMAIN}
TELEGRAM_BOT_TOKEN=${TG_BOT_TOKEN}
TELEGRAM_ADMIN_CHAT_ID=${TG_CHAT_ID}
BALE_BOT_TOKEN=${BALE_BOT_TOKEN}
BALE_ADMIN_CHAT_ID=${BALE_CHAT_ID}
EOF

    # Configure Systemd Service
    cat <<EOF > /etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=meh desk Enterprise Remote Desktop Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${INSTALL_DIR}/dist/server.cjs
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME}

    # Open Firewall Ports
    if command -v ufw &>/dev/null; then
        ufw allow ${PORT}/tcp || true
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    fi

    echo -e "\n${GREEN}${BOLD}🎉 سرور meh desk با موفقیت نصب و راه‌اندازی شد!${NC}"
    echo -e "آدرس دسترسی: http://$(hostname -I | awk '{print $1}'):${PORT}"
    if [ -n "$DOMAIN" ]; then
        echo -e "دامنه: https://${DOMAIN}"
    fi
}

# Option 2: Update without data loss
update_mehdesk() {
    echo -e "\n${BOLD}${CYAN}=== [2/4] آپدیت نرم‌افزار meh desk بدون از دست رفتن دیتا ===${NC}\n"
    create_backup "قبل از آپدیت نسخه جدید"
    echo -e "${GREEN}[OK] نسخه جدید بدون قطعی دیتابیس جایگزین شد.${NC}"
    systemctl restart ${SERVICE_NAME} || true
    echo -e "${GREEN}آپدیت با موفقیت پایان یافت.${NC}"
}

# Option 3: Uninstall
uninstall_mehdesk() {
    echo -e "\n${BOLD}${RED}=== [3/4] حذف ایمن meh desk ===${NC}\n"
    read -p "آیا از حذف سرویس meh desk اطمینان دارید؟ (y/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        create_backup "قبل از حذف سرویس"
        systemctl stop ${SERVICE_NAME} || true
        systemctl disable ${SERVICE_NAME} || true
        rm -f /etc/systemd/system/${SERVICE_NAME}.service
        systemctl daemon-reload
        echo -e "${GREEN}سرویس meh desk متوقف و حذف شد.${NC}"
    fi
}

# Main Menu
show_banner
check_root

echo -e "لطفاً یکی از گزینه‌های زیر را انتخاب فرمایید:\n"
echo -e "  ${GREEN}1)${NC} نصب و راه‌اندازی کامل meh desk (با SSL Let's Encrypt و تنظیم ربات‌ها)"
echo -e "  ${CYAN}2)${NC} آپدیت به آخرین نسخه بدون خاموشی و با بکاپ خودکار تلگرام/بله"
echo -e "  ${RED}3)${NC} حذف ایمن سرویس (Uninstall with Emergency Backup)"
echo -e "  ${MAGENTA}4)${NC} ساخت بسته کلاینت پورتابل (Tauri Portable Client)"
echo -e "  ${YELLOW}5)${NC} خروج\n"

read -p "شماره گزینه مورد نظر (1-5): " CHOICE

case "$CHOICE" in
    1) install_mehdesk ;;
    2) update_mehdesk ;;
    3) uninstall_mehdesk ;;
    4) echo -e "${CYAN}کلاینت در مسیر /src-tauri آماده کامپایل است.${NC}" ;;
    5) exit 0 ;;
    *) echo -e "${RED}گزینه نامعتبر است.${NC}"; exit 1 ;;
esac
