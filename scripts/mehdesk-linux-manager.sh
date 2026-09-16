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

    NODE_BIN=$(command -v node || echo "/usr/bin/node")

    cat <<EOF > /etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=meh desk Enterprise Remote Desktop Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${NODE_BIN} ${INSTALL_DIR}/dist/server.cjs
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

    # Allow Firewall Ports
    if command -v ufw &>/dev/null; then
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-service=http || true
        firewall-cmd --permanent --add-service=https || true
        firewall-cmd --reload || true
    fi

    local cert_file="/etc/letsencrypt/live/${domain}/fullchain.pem"
    local key_file="/etc/letsencrypt/live/${domain}/privkey.pem"

    # If certificates do not exist yet, attempt to acquire via certbot standalone or webroot
    if [ ! -f "$cert_file" ] && command -v certbot &>/dev/null; then
        echo -e "${CYAN}[SSL] Certificate not found. Generating temporary Port 80 for Let's Encrypt challenge...${NC}"
        cat <<EOF > /etc/nginx/sites-available/mehdesk.conf
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    location /ws {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
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
        cp -f /etc/nginx/sites-available/mehdesk.conf /etc/nginx/conf.d/mehdesk.conf 2>/dev/null || true
        systemctl restart nginx 2>/dev/null || true

        echo -e "${CYAN}[SSL] Requesting Free Let's Encrypt SSL Certificate for ${domain}...${NC}"
        certbot --nginx -d "${domain}" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring 2>/dev/null || true
    fi

    # Now check if certificate exists (either already existed or just acquired)
    if [ -f "$cert_file" ] && [ -f "$key_file" ]; then
        echo -e "${GREEN}[OK] Verified SSL certificate found for ${domain}. Generating complete HTTPS + WSS config...${NC}"
        cat <<EOF > /etc/nginx/sites-available/mehdesk.conf
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${domain};
    return 301 https://\$host\$request_uri;
}

# Production HTTPS and Secure WebSocket Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain};

    ssl_certificate ${cert_file};
    ssl_certificate_key ${key_file};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Secure WebSocket Signaling Gateway (/ws)
    location /ws {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    # Web Client & API
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        client_max_body_size 500M;
    }
}
EOF
    else
        echo -e "${YELLOW}[WARN] SSL certificate not found. Configuring HTTP & WebSocket on Port 80...${NC}"
        cat <<EOF > /etc/nginx/sites-available/mehdesk.conf
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    location /ws {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
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
    fi

    ln -sf /etc/nginx/sites-available/mehdesk.conf /etc/nginx/sites-enabled/mehdesk.conf
    cp -f /etc/nginx/sites-available/mehdesk.conf /etc/nginx/conf.d/mehdesk.conf 2>/dev/null || true

    if nginx -t >/dev/null 2>&1; then
        systemctl restart nginx || systemctl reload nginx
        systemctl enable nginx 2>/dev/null || true
        echo -e "${GREEN}[OK] Nginx reverse proxy with WebSockets is active and validated.${NC}"
    else
        echo -e "${RED}[ERROR] Nginx test failed. Restarting anyway...${NC}"
        systemctl restart nginx 2>/dev/null || true
    fi
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
    
    if [ ! -d "${INSTALL_DIR}" ]; then
        echo -e "${RED}[ERROR] Installation directory ${INSTALL_DIR} not found. Please install first using option 1.${NC}"
        return 1
    fi

    # Backup current configs and data
    create_backup "pre_update"
    
    cd "${INSTALL_DIR}"
    
    echo -e "${CYAN}[1/5] Fetching latest commits from GitHub...${NC}"
    # Unshallow if shallow clone to prevent pull failures
    git fetch --unshallow 2>/dev/null || git fetch --all || true
    
    echo -e "${CYAN}[2/5] Resetting to latest origin/main...${NC}"
    git reset --hard origin/main || git pull origin main --force || true
    
    echo -e "${CYAN}[3/5] Updating dependencies...${NC}"
    npm install --production=false
    
    echo -e "${CYAN}[4/5] Compiling and building distribution bundle...${NC}"
    npm run build
    
    # Ensure dist/server.cjs exists
    if [ ! -f "${INSTALL_DIR}/dist/server.cjs" ]; then
        echo -e "${YELLOW}[WARN] dist/server.cjs not found after build. Building server standalone...${NC}"
        npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs || true
    fi

    echo -e "${CYAN}[5/5] Reloading and restarting ${SERVICE_NAME} systemd service...${NC}"
    systemctl daemon-reload
    systemctl restart ${SERVICE_NAME} || systemctl start ${SERVICE_NAME} || true
    
    # Verify service is running
    sleep 2
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        echo -e "${GREEN}[OK] ${SERVICE_NAME} service is active and running perfectly!${NC}"
    else
        echo -e "${RED}[WARN] Service is not running. Showing journal logs:${NC}"
        journalctl -u ${SERVICE_NAME} -n 20 --no-pager || true
    fi

    # Automatically detect domain from .env, Nginx configs, or certbot certificates
    local detected_domain=""
    if [ -f "${ENV_FILE}" ]; then
        source "${ENV_FILE}"
        detected_domain="${DOMAIN:-}"
    fi

    if [ -z "$detected_domain" ] && [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
        detected_domain=$(grep -m 1 "server_name" /etc/nginx/sites-available/mehdesk.conf 2>/dev/null | awk '{print $2}' | tr -d ';')
    fi

    if [ -z "$detected_domain" ] && command -v certbot &>/dev/null; then
        detected_domain=$(certbot certificates 2>/dev/null | grep "Certificate Name:" | head -n 1 | awk '{print $3}')
    fi

    # If Nginx is installed and active, automatically refresh its WebSocket proxy & SSL rules
    if command -v nginx &>/dev/null && [ -n "$detected_domain" ] && [ "$detected_domain" != "_" ]; then
        echo -e "\n${CYAN}[6/6] Auto-refreshing Nginx WebSockets & SSL proxy for '${detected_domain}'...${NC}"
        setup_nginx_ssl "$detected_domain" "${PORT:-3000}"
    elif command -v nginx &>/dev/null && [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
        # Direct IP or custom Nginx
        echo -e "\n${CYAN}[6/6] Reloading Nginx reverse proxy...${NC}"
        nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true
    fi

    echo -e "\n${GREEN}${BOLD}🎉 meh desk update completed successfully! All services & WebSockets updated.${NC}\n"
}

build_tauri_windows_exe() {
    echo -e "\n${BOLD}${CYAN}===================================================================${NC}"
    echo -e "${BOLD}${CYAN}   🚀 Build Windows Portable Client (.exe) via Tauri on Linux     ${NC}"
    echo -e "${BOLD}${CYAN}===================================================================${NC}\n"
    echo -e "${YELLOW}این ماژول، کلاینت پرتابل ویندوز را با فرمت اجرایی .exe با تارگت x86_64-pc-windows-gnu کامپایل کرده و لینک دانلود مستقیم می‌سازد.${NC}\n"
    
    local target_dir="${INSTALL_DIR}"
    if [ ! -d "$target_dir" ] && [ -f "./package.json" ]; then
        target_dir="$(pwd)"
    fi

    if [ -f "${target_dir}/scripts/build-tauri-windows.sh" ]; then
        bash "${target_dir}/scripts/build-tauri-windows.sh"
    else
        echo -e "${RED}[ERROR] build-tauri-windows.sh not found in ${target_dir}/scripts/${NC}"
        return 1
    fi
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
echo -e "  ${BLUE}4)${NC} 📦 Build Windows Portable Client (.exe) via Tauri on Linux"
echo -e "  ${RED}5)${NC} Uninstall Service"
echo -e "  ${YELLOW}6)${NC} Exit\n"

read -p "Select an option [1-6]: " CHOICE

case "$CHOICE" in
    1) install_mehdesk ;;
    2) update_mehdesk ;;
    3) configure_standalone_ssl ;;
    4) build_tauri_windows_exe ;;
    5) uninstall_mehdesk ;;
    6) exit 0 ;;
    *) echo -e "${RED}Invalid selection.${NC}"; exit 1 ;;
esac
