#!/usr/bin/env bash
# ==============================================================================
# meh desk - Enterprise Remote Desktop & Management Suite Installer
# GitHub Repository: https://github.com/meh732/mehdesk.git
# Supported OS: Ubuntu 20.04+, Debian 11+, CentOS/RHEL/Rocky/AlmaLinux 8+, Fedora
# ==============================================================================

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m'

REPO_URL="https://github.com/meh732/mehdesk.git"
INSTALL_DIR="/usr/local/mehdesk"
SERVICE_NAME="mehdesk"
CLI_COMMAND="/usr/local/bin/mehdesk"
BACKUP_DIR="/usr/local/mehdesk/backups"
ENV_FILE="${INSTALL_DIR}/.env"

show_logo() {
    clear
    echo -e "${RED}${BOLD}"
    echo "  ███╗   ███╗███████╗██╗  ██╗    ██████╗ ███████╗███████╗██╗  ██╗"
    echo "  ████╗ ████║██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██║ ██╔╝"
    echo "  ██╔████╔██║█████╗  ███████║    ██║  ██║█████╗  ███████╗█████╔╝ "
    echo "  ██║╚██╔╝██║██╔══╝  ██╔══██║    ██║  ██║██╔══╝  ╚════██║██╔═██╗ "
    echo "  ██║ ╚═╝ ██║███████╗██║  ██║    ██████╔╝███████╗███████║██║  ██╗"
    echo "  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${CYAN}${BOLD}       meh desk - Enterprise Remote Desktop & Fleet Suite${NC}"
    echo -e "${WHITE}       GitHub: ${REPO_URL}${NC}"
    echo -e "${YELLOW}===================================================================${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}[ERROR] لطفاً این اسکریپت را با دسترسی روت اجرا کنید:${NC}"
        echo -e "${YELLOW}sudo bash $0${NC}"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        echo -e "${RED}[ERROR] سیستم‌عامل شما شناسایی نشد.${NC}"
        exit 1
    fi
}

install_dependencies() {
    echo -e "\n${CYAN}${BOLD}[1/5] در حال بررسی و نصب پیش‌نیازهای سیستمی (Git, Curl, Node.js, Nginx)...${NC}"
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y
        apt-get install -y curl wget git tar ufw nginx socat cron jq certbot python3-certbot-nginx build-essential
        
        # Check Node.js
        if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
            echo -e "${YELLOW}در حال نصب آخرین نسخه پایدار Node.js 20 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
    elif [ "$OS" = "centos" ] || [ "$OS" = "almalinux" ] || [ "$OS" = "rocky" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        dnf update -y
        dnf install -y curl wget git tar epel-release nginx firewalld socat cronie jq certbot python3-certbot-nginx gcc-c++ make
        if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
            echo -e "${YELLOW}در حال نصب Node.js 20 LTS...${NC}"
            dnf module reset nodejs -y 2>/dev/null || true
            dnf module enable nodejs:20 -y 2>/dev/null || true
            dnf install -y nodejs
        fi
    fi

    echo -e "${GREEN}[OK] پیش‌نیازهای پایه با موفقیت نصب شدند.${NC}"
}

create_cli_tool() {
    cat << 'EOF' > "${CLI_COMMAND}"
#!/usr/bin/env bash
# meh desk CLI Controller

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="/usr/local/mehdesk"
SERVICE_NAME="mehdesk"
REPO_URL="https://github.com/meh732/mehdesk.git"

show_menu() {
    clear
    echo -e "${RED}${BOLD}"
    echo "  ███╗   ███╗███████╗██╗  ██╗    ██████╗ ███████╗███████╗██╗  ██╗"
    echo "  ████╗ ████║██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██║ ██╔╝"
    echo "  ██╔████╔██║█████╗  ███████║    ██║  ██║█████╗  ███████╗█████╔╝ "
    echo "  ██║╚██╔╝██║██╔══╝  ██╔══██║    ██║  ██║██╔══╝  ╚════██║██╔═██╗ "
    echo "  ██║ ╚═╝ ██║███████╗██║  ██║    ██████╔╝███████╗███████║██║  ██╗"
    echo "  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${CYAN}${BOLD}                 مدیریت سرور meh desk v9.0${NC}"
    echo -e "${YELLOW}===================================================================${NC}"
    
    # Check Service Status
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        echo -e " وضعیت سرویس: ${GREEN}● فعال و در حال اجرا (Running)${NC}"
    else
        echo -e " وضعیت سرویس: ${RED}○ متوقف شده (Stopped)${NC}"
    fi

    if [ -f "${INSTALL_DIR}/.env" ]; then
        source "${INSTALL_DIR}/.env"
        echo -e " پورت فعال: ${CYAN}${PORT:-3000}${NC} | دامنه: ${CYAN}${DOMAIN:-'IP مستقیم'}${NC}"
    fi
    echo -e "${YELLOW}-------------------------------------------------------------------${NC}"

    echo -e "  ${GREEN}1)${NC} شروع / راه‌اندازی مجدد سرویس (Restart)"
    echo -e "  ${YELLOW}2)${NC} توقف سرویس (Stop)"
    echo -e "  ${CYAN}3)${NC} مشاهده لاگ‌های زنده سرور و اتصالات ریموت (Live Logs)"
    echo -e "  ${BLUE}4)${NC} آپدیت meh desk به آخرین نسخه گیت‌هاب بدون حذف دیتا (Update)"
    echo -e "  ${PURPLE}5)${NC} تغییر پورت سرویس (Change Port)"
    echo -e "  ${CYAN}6)${NC} تنظیم دامنه و فعال‌سازی رایگان SSL Let's Encrypt"
    echo -e "  ${WHITE}7)${NC} ارسال فوری فایل بکاپ دیتابیس به تلگرام و بله (Backup)"
    echo -e "  ${YELLOW}8)${NC} بازیابی و ریست پین ادمین مستر (Reset Admin PIN)"
    echo -e "  ${RED}9)${NC} حذف کامل سرویس meh desk (Uninstall)"
    echo -e "  ${BOLD}0)${NC} خروج از پنل\n"
    read -p "لطفاً عدد گزینه مورد نظر را وارد نمایید [0-9]: " choice

    case "$choice" in
        1)
            systemctl restart ${SERVICE_NAME}
            echo -e "${GREEN}سرویس meh desk با موفقیت ری‌استارت شد.${NC}"
            sleep 2
            show_menu
            ;;
        2)
            systemctl stop ${SERVICE_NAME}
            echo -e "${YELLOW}سرویس meh desk متوقف گردید.${NC}"
            sleep 2
            show_menu
            ;;
        3)
            echo -e "${CYAN}در حال نمایش لاگ‌ها (برای خروج Ctrl+C را بزنید)...${NC}"
            journalctl -u ${SERVICE_NAME} -f -n 50
            ;;
        4)
            echo -e "${CYAN}در حال دریافت آخرین تغییرات از گیت‌هاب...${NC}"
            cd "${INSTALL_DIR}"
            git fetch --all
            git reset --hard origin/main || git pull origin main
            npm install --production=false
            npm run build
            systemctl restart ${SERVICE_NAME}
            echo -e "${GREEN}آپدیت با موفقیت اعمال شد.${NC}"
            sleep 2
            show_menu
            ;;
        5)
            read -p "پورت جدید مورد نظر را وارد کنید: " NEW_PORT
            if [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
                sed -i "s/PORT=.*/PORT=${NEW_PORT}/" "${INSTALL_DIR}/.env"
                if command -v ufw >/dev/null 2>&1; then
                    ufw allow ${NEW_PORT}/tcp || true
                fi
                systemctl restart ${SERVICE_NAME}
                echo -e "${GREEN}پورت با موفقیت به ${NEW_PORT} تغییر یافت.${NC}"
            else
                echo -e "${RED}پورت نامعتبر است.${NC}"
            fi
            sleep 2
            show_menu
            ;;
        6)
            read -p "دامنه متصل به این سرور را وارد فرمایید (مثال: remote.example.com): " USER_DOMAIN
            if [ -n "$USER_DOMAIN" ]; then
                certbot --nginx -d "$USER_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || true
                sed -i "s/DOMAIN=.*/DOMAIN=${USER_DOMAIN}/" "${INSTALL_DIR}/.env"
                systemctl restart ${SERVICE_NAME}
                echo -e "${GREEN}دامنه و گواهی SSL با موفقیت فعال شد: https://${USER_DOMAIN}${NC}"
            fi
            sleep 3
            show_menu
            ;;
        7)
            echo -e "${CYAN}در حال تهیه و ارسال پشتیبان...${NC}"
            curl -s -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/dispatch-backup" || true
            echo -e "${GREEN}پشتیبان به ربات‌های ادمین تلگرام و بله مخابره شد.${NC}"
            sleep 3
            show_menu
            ;;
        8)
            read -p "پین جدید ادمین (PIN) را وارد فرمایید: " NEW_PIN
            if [ -n "$NEW_PIN" ]; then
                curl -s -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/settings" \
                     -H "Content-Type: application/json" \
                     -d "{\"adminPin\":\"${NEW_PIN}\"}" || true
                echo -e "${GREEN}پین ادمین با موفقیت به ${NEW_PIN} تغییر یافت.${NC}"
            fi
            sleep 2
            show_menu
            ;;
        9)
            read -p "آیا از حذف کامل meh desk اطمینان دارید؟ [y/N]: " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                systemctl stop ${SERVICE_NAME} || true
                systemctl disable ${SERVICE_NAME} || true
                rm -f /etc/systemd/system/${SERVICE_NAME}.service
                systemctl daemon-reload
                rm -rf "${INSTALL_DIR}"
                rm -f "${CLI_COMMAND}"
                echo -e "${GREEN}meh desk به صورت کامل از سرور شما پاک شد.${NC}"
                exit 0
            fi
            show_menu
            ;;
        0)
            exit 0
            ;;
        *)
            echo -e "${RED}گزینه نامعتبر است.${NC}"
            sleep 1
            show_menu
            ;;
    esac
}

show_menu
EOF
    chmod +x "${CLI_COMMAND}"
}

install_mehdesk_core() {
    echo -e "\n${CYAN}${BOLD}[2/5] دریافت سورس نرم‌افزار meh desk از گیت‌هاب...${NC}"
    
    mkdir -p "${BACKUP_DIR}"

    if [ -d "${INSTALL_DIR}/.git" ]; then
        echo -e "${YELLOW}پوشه موجود شناسایی شد. در حال آپدیت سورس...${NC}"
        cd "${INSTALL_DIR}"
        git fetch --all
        git reset --hard origin/main || git pull origin main
    else
        rm -rf "${INSTALL_DIR}"
        git clone "${REPO_URL}" "${INSTALL_DIR}"
        cd "${INSTALL_DIR}"
    fi

    echo -e "\n${CYAN}${BOLD}[3/5] نصب پکیج‌ها و بیلد باندل بهینه سرور و کلاینت...${NC}"
    npm install --production=false
    npm run build

    echo -e "\n${CYAN}${BOLD}[4/5] پیکربندی تنظیمات محیطی و پورت...${NC}"
    
    # Prompt for port if fresh install
    if [ ! -f "${ENV_FILE}" ]; then
        echo -e "${WHITE}لطفاً پورت دسترسی پنل را مشخص کنید (پیش‌فرض: 3000):${NC}"
        read -p "Port [3000]: " USER_PORT
        PORT=${USER_PORT:-3000}

        echo -e "${WHITE}دامنه اختصاصی سرور (اختیاری - در صورت داشتن دامنه وارد کنید، در غیر این صورت خالی بگذارید):${NC}"
        read -p "Domain (Optional): " USER_DOMAIN
        DOMAIN=${USER_DOMAIN:-""}

        cat <<EOF > "${ENV_FILE}"
PORT=${PORT}
NODE_ENV=production
DOMAIN=${DOMAIN}
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
BALE_BOT_TOKEN=
BALE_ADMIN_CHAT_ID=
EOF
    else
        source "${ENV_FILE}"
        PORT=${PORT:-3000}
    fi

    # Create Systemd Service
    echo -e "\n${CYAN}${BOLD}[5/5] ساخت و فعال‌سازی سرویس دائمی سیستمی (${SERVICE_NAME}.service)...${NC}"
    
    cat <<EOF > "/etc/systemd/system/${SERVICE_NAME}.service"
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
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}"
    systemctl restart "${SERVICE_NAME}"

    # Open Firewall Ports
    if command -v ufw >/dev/null 2>&1; then
        ufw allow "${PORT}/tcp" || true
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-port="${PORT}/tcp" || true
        firewall-cmd --permanent --add-service=http || true
        firewall-cmd --permanent --add-service=https || true
        firewall-cmd --reload || true
    fi

    create_cli_tool

    # Detect IP
    SERVER_IP=$(curl -s4 icanhazip.com || curl -s4 ifconfig.me || hostname -I | awk '{print $1}')

    echo -e "\n${GREEN}${BOLD}===================================================================${NC}"
    echo -e "${GREEN}${BOLD}🎉 نرم‌افزار meh desk با موفقیت روی سرور نصب و راه‌اندازی شد!${NC}"
    echo -e "${GREEN}${BOLD}===================================================================${NC}"
    echo -e " 🌐 آدرس وب پنل: ${CYAN}${BOLD}http://${SERVER_IP}:${PORT}${NC}"
    if [ -n "$DOMAIN" ]; then
        echo -e " 🔒 دامنه اختصاصی: ${CYAN}${BOLD}https://${DOMAIN}${NC}"
    fi
    echo -e " 🔑 پین پیش‌فرض ورود به پنل ادمین و ربات‌ها: ${YELLOW}${BOLD}123456${NC}"
    echo -e " 💻 دستور مدیریت پنل در ترمینال: ${MAGENTA}${BOLD}mehdesk${NC}"
    echo -e "${YELLOW}-------------------------------------------------------------------${NC}"
    echo -e "${WHITE}از این پس با تایپ ${GREEN}mehdesk${WHITE} در هر نقطه از ترمینال، منوی مدیریت را باز کنید.${NC}\n"
}

# Main Execution Flow
show_logo
check_root
detect_os
install_dependencies
install_mehdesk_core
