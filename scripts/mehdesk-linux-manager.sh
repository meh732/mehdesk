#!/usr/bin/env bash
# ==============================================================================
# meh desk - Linux Management & Deployment Script
# Language: English
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="/usr/local/mehdesk"
BACKUP_DIR="/usr/local/mehdesk/backups"
SERVICE_NAME="mehdesk"
ENV_FILE="${INSTALL_DIR}/.env"

# Placeholders
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
        echo -e "${RED}[ERROR] This script must be run with root privileges.${NC}"
        echo -e "${YELLOW}Run with: sudo bash $0${NC}"
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

    echo -e "${CYAN}[TELEGRAM] Uploading backup to Telegram...${NC}"
    if [ -f "$file_path" ]; then
        curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendDocument" \
            -F chat_id="${chat_id}" \
            -F document=@"${file_path}" \
            -F caption="${caption}" > /dev/null 2>&1 || echo -e "${YELLOW}[WARN] Telegram delivery failed.${NC}"
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

    echo -e "${CYAN}[BALE] Uploading backup to Bale messenger (tapi.bale.ai)...${NC}"
    if [ -f "$file_path" ]; then
        curl -s -X POST "https://tapi.bale.ai/bot${bot_token}/sendDocument" \
            -F chat_id="${chat_id}" \
            -F document=@"${file_path}" \
            -F caption="${caption}" > /dev/null 2>&1 || echo -e "${YELLOW}[WARN] Bale delivery failed.${NC}"
    fi
}

create_backup() {
    local reason="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/mehdesk_backup_${timestamp}.tar.gz"

    mkdir -p "${BACKUP_DIR}"

    if [ -d "${INSTALL_DIR}" ]; then
        echo -e "${CYAN}[BACKUP] Creating archive (${reason})...${NC}"
        tar -czf "${backup_file}" -C "${INSTALL_DIR}" .env 2>/dev/null || true
        echo -e "${GREEN}[OK] Backup stored at: ${backup_file}${NC}"

        if [ -f "${ENV_FILE}" ]; then
            source "${ENV_FILE}"
        fi

        local tg_token="${TELEGRAM_BOT_TOKEN:-$TG_BOT_TOKEN}"
        local tg_chat="${TELEGRAM_ADMIN_CHAT_ID:-$TG_CHAT_ID}"
        local bale_token="${BALE_BOT_TOKEN:-$BALE_BOT_TOKEN}"
        local bale_chat="${BALE_ADMIN_CHAT_ID:-$BALE_CHAT_ID}"

        local caption="📦 Automatic backup for meh desk\nDate: $(date)\nHost: $(hostname)\nReason: ${reason}"
        send_to_telegram "${tg_token}" "${tg_chat}" "${backup_file}" "${caption}"
        send_to_bale "${bale_token}" "${bale_chat}" "${backup_file}" "${caption}"
    fi
}

install_mehdesk() {
    echo -e "\n${BOLD}${GREEN}=== [1/4] Starting meh desk Installation ===${NC}\n"

    read -p "🔹 Service Port (Default: 3000): " PORT_INPUT
    PORT=${PORT_INPUT:-3000}

    read -p "🔹 Custom Domain (e.g. remote.company.com or empty for direct IP): " DOMAIN_INPUT
    DOMAIN=${DOMAIN_INPUT:-""}

    echo -e "\n${YELLOW}=== Admin Bot Notifications (Optional) ===${NC}"
    read -p "🔹 Telegram Bot Token (Optional): " TG_TOKEN_INPUT
    TG_BOT_TOKEN=${TG_TOKEN_INPUT:-$TG_BOT_TOKEN}

    if [ -n "$TG_BOT_TOKEN" ]; then
        read -p "🔹 Telegram Admin Chat ID: " TG_CHAT_INPUT
        TG_CHAT_ID=${TG_CHAT_INPUT:-$TG_CHAT_ID}
    fi

    read -p "🔹 Bale Bot Token (Optional): " BALE_TOKEN_INPUT
    BALE_BOT_TOKEN=${BALE_TOKEN_INPUT:-$BALE_BOT_TOKEN}

    if [ -n "$BALE_BOT_TOKEN" ]; then
        read -p "🔹 Bale Admin Chat ID: " BALE_CHAT_INPUT
        BALE_CHAT_ID=${BALE_CHAT_INPUT:-$BALE_CHAT_ID}
    fi

    # Install packages
    echo -e "\n${CYAN}[1/5] Updating packages and installing Node.js 20...${NC}"
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

    mkdir -p "${INSTALL_DIR}" "${BACKUP_DIR}"

    if [ -d "${INSTALL_DIR}/.git" ]; then
        cd "${INSTALL_DIR}"
        git fetch --all
        git reset --hard origin/main || git pull origin main
    else
        rm -rf "${INSTALL_DIR}"
        git clone "https://github.com/meh732/mehdesk.git" "${INSTALL_DIR}"
        cd "${INSTALL_DIR}"
    fi

    npm install --production=false
    npm run build

    cat <<EOF > "${ENV_FILE}"
PORT=${PORT}
NODE_ENV=production
DOMAIN=${DOMAIN}
TELEGRAM_BOT_TOKEN=${TG_BOT_TOKEN}
TELEGRAM_ADMIN_CHAT_ID=${TG_CHAT_ID}
BALE_BOT_TOKEN=${BALE_BOT_TOKEN}
BALE_ADMIN_CHAT_ID=${BALE_CHAT_ID}
EOF

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
    systemctl restart ${SERVICE_NAME}

    if command -v ufw &>/dev/null; then
        ufw allow ${PORT}/tcp || true
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    fi

    SERVER_IP=$(curl -s4 icanhazip.com || curl -s4 ifconfig.me || hostname -I | awk '{print $1}')

    if [ -n "$DOMAIN" ]; then
        setup_nginx_ssl "$DOMAIN" "$PORT"
    fi

    echo -e "\n${GREEN}${BOLD}🎉 meh desk successfully installed and running!${NC}"
    echo -e "Direct IP Web Panel: http://${SERVER_IP}:${PORT}"
    if [ -n "$DOMAIN" ]; then
        echo -e "Domain Access (SSL): https://${DOMAIN}"
    fi
}

setup_nginx_ssl() {
    local domain="$1"
    local port="$2"

    if [ -z "$domain" ]; then
        return 0
    fi

    echo -e "\n${CYAN}[SSL] Configuring Nginx Reverse Proxy & SSL for ${domain}...${NC}"

    # Ensure Nginx & Certbot are installed
    if command -v apt-get &>/dev/null; then
        apt-get update -y >/dev/null 2>&1 || true
        apt-get install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1 || true
    elif command -v dnf &>/dev/null; then
        dnf install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1 || true
    fi

    # Wipe out conflicting default configs
    rm -f /etc/nginx/sites-enabled/* /etc/nginx/conf.d/default.conf /etc/nginx/sites-available/default 2>/dev/null || true
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d

    # Create Nginx site configuration with full WebSocket & PWA support
    cat <<EOF > /etc/nginx/sites-available/mehdesk.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        client_max_body_size 500M;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/mehdesk.conf /etc/nginx/sites-enabled/mehdesk.conf
    # Also write to conf.d for CentOS/RHEL/AlmaLinux compatibility
    cp -f /etc/nginx/sites-available/mehdesk.conf /etc/nginx/conf.d/mehdesk.conf 2>/dev/null || true

    # Test nginx configuration
    if nginx -t >/dev/null 2>&1; then
        systemctl restart nginx || systemctl reload nginx
        systemctl enable nginx 2>/dev/null || true
        echo -e "${GREEN}[OK] Nginx reverse proxy configured.${NC}"
    else
        echo -e "${RED}[ERROR] Nginx configuration test failed.${NC}"
        systemctl restart nginx 2>/dev/null || true
    fi

    # Allow Firewall Ports
    if command -v ufw &>/dev/null; then
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-service=http || true
        firewall-cmd --permanent --add-service=https || true
        firewall-cmd --reload || true
    fi

    # Request / Re-link Let's Encrypt SSL Certificate
    echo -e "${CYAN}[SSL] Requesting / Linking Free Let's Encrypt SSL Certificate for ${domain}...${NC}"
    certbot --nginx -d "${domain}" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring 2>/dev/null || {
        echo -e "${YELLOW}[WARN] Automatic Certbot SSL configuration could not link automatically.${NC}"
    }

    systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
}

configure_standalone_ssl() {
    echo -e "\n${BOLD}${CYAN}=== Configure Domain & Free SSL (HTTPS) ===${NC}\n"
    read -p "🔹 Enter Your Domain (e.g. desk.domain.com): " DOM_INPUT
    if [ -z "$DOM_INPUT" ]; then
        echo -e "${RED}Error: Domain cannot be empty.${NC}"
        return 1
    fi

    local current_port="3000"
    if [ -f "${ENV_FILE}" ]; then
        source "${ENV_FILE}"
        current_port="${PORT:-3000}"
    fi

    read -p "🔹 Backend Service Port [Default: ${current_port}]: " PORT_CONFIRM
    local target_port=${PORT_CONFIRM:-$current_port}

    setup_nginx_ssl "$DOM_INPUT" "$target_port"
}

update_mehdesk() {
    echo -e "\n${BOLD}${CYAN}=== Updating meh desk without data loss ===${NC}\n"
    create_backup "pre_update"
    cd "${INSTALL_DIR}"
    git fetch --all
    git reset --hard origin/main || git pull origin main
    npm install --production=false
    npm run build
    systemctl restart ${SERVICE_NAME} || true

    # If domain is set, automatically ensure Nginx & SSL are intact
    if [ -f "${ENV_FILE}" ]; then
        source "${ENV_FILE}"
        if [ -n "$DOMAIN" ]; then
            echo -e "\n${CYAN}Detected domain '${DOMAIN}' in .env. Verifying Nginx & SSL configuration...${NC}"
            setup_nginx_ssl "$DOMAIN" "${PORT:-3000}"
        fi
    fi

    echo -e "${GREEN}[OK] Update completed successfully.${NC}"
}

uninstall_mehdesk() {
    echo -e "\n${BOLD}${RED}=== Uninstalling meh desk ===${NC}\n"
    read -p "Are you sure you want to remove meh desk? (y/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        create_backup "pre_uninstall"
        systemctl stop ${SERVICE_NAME} || true
        systemctl disable ${SERVICE_NAME} || true
        rm -f /etc/systemd/system/${SERVICE_NAME}.service
        systemctl daemon-reload
        rm -rf "${INSTALL_DIR}"
        echo -e "${GREEN}meh desk removed.${NC}"
    fi
}

# Main Interactive Menu
show_banner
check_root

echo -e "Please select an option:\n"
echo -e "  ${GREEN}1)${NC} Install / Reinstall meh desk"
echo -e "  ${CYAN}2)${NC} Update to Latest Release (No Data Loss)"
echo -e "  ${PURPLE}3)${NC} Setup Domain & Free SSL (Nginx / Certbot)"
echo -e "  ${RED}4)${NC} Uninstall Service"
echo -e "  ${YELLOW}5)${NC} Exit\n"

read -p "Select an option [1-5]: " CHOICE

case "$CHOICE" in
    1) install_mehdesk ;;
    2) update_mehdesk ;;
    3) configure_standalone_ssl ;;
    4) uninstall_mehdesk ;;
    5) exit 0 ;;
    *) echo -e "${RED}Invalid selection.${NC}"; exit 1 ;;
esac
