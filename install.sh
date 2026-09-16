#!/usr/bin/env bash
# ==============================================================================
# meh desk - Enterprise Remote Desktop & Fleet Management Suite
# GitHub Repository: https://github.com/meh732/mehdesk.git
# Supported OS: Ubuntu 20.04+, Debian 11+, CentOS/RHEL/Rocky/AlmaLinux 8+, Fedora
# Language: English (Official CLI Standard)
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
        echo -e "${RED}[ERROR] Please run this script with root privileges:${NC}"
        echo -e "${YELLOW}sudo bash $0${NC}"
        exit 1
    fi
}

get_clean_ip() {
    local candidate=""
    for api in "https://api.ipify.org" "https://ipv4.icanhazip.com" "https://ifconfig.co" "https://ident.me"; do
        candidate=$(curl -s4 -m 3 "$api" 2>/dev/null | tr -d '[:space:]' || true)
        if [[ "$candidate" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "$candidate"
            return 0
        fi
    done
    hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        echo -e "${RED}[ERROR] Operating system not recognized.${NC}"
        exit 1
    fi
}

install_dependencies() {
    echo -e "\n${CYAN}${BOLD}[1/4] Checking and installing system dependencies (Git, Curl, Node.js, Nginx)...${NC}"
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y
        apt-get install -y curl wget git tar ufw nginx socat cron jq certbot python3-certbot-nginx build-essential
        
        # Check Node.js
        if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
            echo -e "${YELLOW}Installing Node.js 20 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
    elif [ "$OS" = "centos" ] || [ "$OS" = "almalinux" ] || [ "$OS" = "rocky" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        dnf update -y
        dnf install -y curl wget git tar epel-release nginx firewalld socat cronie jq certbot python3-certbot-nginx gcc-c++ make
        if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
            echo -e "${YELLOW}Installing Node.js 20 LTS...${NC}"
            dnf module reset nodejs -y 2>/dev/null || true
            dnf module enable nodejs:20 -y 2>/dev/null || true
            dnf install -y nodejs
        fi
    fi

    echo -e "${GREEN}[OK] Core dependencies installed successfully.${NC}"
}

create_cli_tool() {
    cat << 'EOF' > "${CLI_COMMAND}"
#!/usr/bin/env bash
# ==============================================================================
# meh desk CLI Controller
# Language: English
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
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
    echo -e "${CYAN}${BOLD}               meh desk Management Console v9.0${NC}"
    echo -e "${YELLOW}===================================================================${NC}"
    
    # Check Service Status
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        echo -e " Service Status: ${GREEN}● Active & Running${NC}"
    else
        echo -e " Service Status: ${RED}○ Stopped / Not Active${NC}"
    fi

    if [ -f "${INSTALL_DIR}/.env" ]; then
        source "${INSTALL_DIR}/.env"
        echo -e " Port: ${CYAN}${PORT:-3000}${NC} | Domain: ${CYAN}${DOMAIN:-'Direct IP'}${NC}"
    fi
    echo -e "${YELLOW}-------------------------------------------------------------------${NC}"

    echo -e "  ${GREEN}1)${NC} Start / Restart Service"
    echo -e "  ${YELLOW}2)${NC} Stop Service"
    echo -e "  ${CYAN}3)${NC} View Real-time Service & Remote Logs (Live)"
    echo -e "  ${BLUE}4)${NC} Update meh desk to Latest Release (Zero Data Loss)"
    echo -e "  ${PURPLE}5)${NC} Change Listening Port"
    echo -e "  ${CYAN}6)${NC} Configure Domain & SSL Certificate (Let's Encrypt)"
    echo -e "  ${WHITE}7)${NC} Trigger Instant Database Backup (Telegram & Bale)"
    echo -e "  ${YELLOW}8)${NC} Reset Admin Master PIN"
    echo -e "  ${RED}9)${NC} Uninstall meh desk Completely"
    echo -e "  ${BOLD}0)${NC} Exit\n"
    read -p "Please select an option [0-9]: " choice

    case "$choice" in
        1)
            systemctl restart ${SERVICE_NAME}
            echo -e "${GREEN}meh desk service restarted successfully.${NC}"
            sleep 2
            show_menu
            ;;
        2)
            systemctl stop ${SERVICE_NAME}
            echo -e "${YELLOW}meh desk service has been stopped.${NC}"
            sleep 2
            show_menu
            ;;
        3)
            echo -e "${CYAN}Streaming live logs (Press Ctrl+C to return to menu)...${NC}"
            journalctl -u ${SERVICE_NAME} -f -n 50
            show_menu
            ;;
        4)
            echo -e "${CYAN}Pulling latest changes from GitHub repository...${NC}"
            cd "${INSTALL_DIR}"
            git fetch --all
            git reset --hard origin/main || git pull origin main
            npm install --production=false
            npm run build
            systemctl restart ${SERVICE_NAME}

            # Automatically detect domain from .env, Nginx configs, or certbot certificates
            local detected_domain=""
            if [ -f "${INSTALL_DIR}/.env" ]; then
                source "${INSTALL_DIR}/.env"
                detected_domain="${DOMAIN:-}"
            fi

            if [ -z "$detected_domain" ] && [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
                detected_domain=$(grep -m 1 "server_name" /etc/nginx/sites-available/mehdesk.conf 2>/dev/null | awk '{print $2}' | tr -d ';')
            fi

            if [ -z "$detected_domain" ] && command -v certbot &>/dev/null; then
                detected_domain=$(certbot certificates 2>/dev/null | grep "Certificate Name:" | head -n 1 | awk '{print $3}')
            fi

            if command -v nginx &>/dev/null && [ -n "$detected_domain" ] && [ "$detected_domain" != "_" ]; then
                echo -e "\n${CYAN}Auto-refreshing Nginx WebSockets & SSL proxy for '${detected_domain}'...${NC}"
                setup_domain_ssl "$detected_domain"
            elif command -v nginx &>/dev/null && [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
                nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true
            fi

            echo -e "${GREEN}Update completed successfully! All services & WebSockets refreshed.${NC}"
            sleep 2
            show_menu
            ;;
        5)
            read -p "Enter new service port: " NEW_PORT
            if [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
                sed -i "s/PORT=.*/PORT=${NEW_PORT}/" "${INSTALL_DIR}/.env"
                if command -v ufw >/dev/null 2>&1; then
                    ufw allow ${NEW_PORT}/tcp || true
                fi
                systemctl restart ${SERVICE_NAME}
                echo -e "${GREEN}Port changed to ${NEW_PORT} successfully.${NC}"
            else
                echo -e "${RED}Invalid port number.${NC}"
            fi
            sleep 2
            show_menu
            ;;
        6)
            read -p "Enter your server domain (e.g., remote.company.com): " USER_DOMAIN
            if [ -n "$USER_DOMAIN" ]; then
                setup_domain_ssl "$USER_DOMAIN"
            fi
            echo -e "\nPress Enter to return to menu..."
            read -r
            show_menu
            ;;
        7)
            echo -e "${CYAN}Dispatching database backup...${NC}"
            curl -s -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/dispatch-backup" || true
            echo -e "${GREEN}Backup dispatched to Telegram and Bale bots.${NC}"
            sleep 3
            show_menu
            ;;
        8)
            read -p "Enter new Admin Master PIN: " NEW_PIN
            if [ -n "$NEW_PIN" ]; then
                curl -s -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/settings" \
                     -H "Content-Type: application/json" \
                     -d "{\"adminPin\":\"${NEW_PIN}\"}" || true
                echo -e "${GREEN}Admin PIN changed to ${NEW_PIN} successfully.${NC}"
            fi
            sleep 2
            show_menu
            ;;
        9)
            read -p "Are you sure you want to completely remove meh desk? [y/N]: " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                systemctl stop ${SERVICE_NAME} || true
                systemctl disable ${SERVICE_NAME} || true
                rm -f /etc/systemd/system/${SERVICE_NAME}.service
                systemctl daemon-reload
                rm -rf "${INSTALL_DIR}"
                rm -f "${CLI_COMMAND}"
                echo -e "${GREEN}meh desk has been completely uninstalled from your server.${NC}"
                exit 0
            fi
            show_menu
            ;;
        0)
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid selection.${NC}"
            sleep 1
            show_menu
            ;;
    esac
}

show_menu
EOF
    chmod +x "${CLI_COMMAND}"
}

setup_domain_ssl() {
    local target_domain="$1"
    local current_port="3000"

    if [ -f "${INSTALL_DIR}/.env" ]; then
        source "${INSTALL_DIR}/.env"
        current_port="${PORT:-3000}"
    fi

    echo -e "\n${CYAN}[SSL] Configuring Nginx Reverse Proxy on port ${current_port} for ${target_domain}...${NC}"

    # Ensure Nginx and Certbot are installed
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -y >/dev/null 2>&1 || true
        apt-get install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1 || true
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1 || true
    fi

    # Wipe out conflicting default configs
    rm -f /etc/nginx/sites-enabled/* /etc/nginx/conf.d/default.conf /etc/nginx/sites-available/default 2>/dev/null || true
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d

    # Open firewall ports for HTTP & HTTPS
    if command -v ufw >/dev/null 2>&1; then
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-service=http || true
        firewall-cmd --permanent --add-service=https || true
        firewall-cmd --reload || true
    fi

    local cert_file="/etc/letsencrypt/live/${target_domain}/fullchain.pem"
    local key_file="/etc/letsencrypt/live/${target_domain}/privkey.pem"

    # If certificates do not exist yet, attempt to acquire via certbot
    if [ ! -f "$cert_file" ] && command -v certbot >/dev/null 2>&1; then
        echo -e "${CYAN}[SSL] Initializing Port 80 for Let's Encrypt automated challenge...${NC}"
        cat << NGINX_CONF > /etc/nginx/sites-available/mehdesk.conf
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${target_domain};

    location /ws {
        proxy_pass http://127.0.0.1:${current_port};
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
        proxy_pass http://127.0.0.1:${current_port};
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
NGINX_CONF
        ln -sf /etc/nginx/sites-available/mehdesk.conf /etc/nginx/sites-enabled/mehdesk.conf
        cp -f /etc/nginx/sites-available/mehdesk.conf /etc/nginx/conf.d/mehdesk.conf 2>/dev/null || true
        systemctl restart nginx 2>/dev/null || true

        echo -e "${CYAN}[SSL] Requesting Let's Encrypt certificate for ${target_domain}...${NC}"
        certbot --nginx -d "${target_domain}" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring 2>/dev/null || true
    fi

    # Check if certificate exists (either already present or just generated)
    if [ -f "$cert_file" ] && [ -f "$key_file" ]; then
        echo -e "${GREEN}[OK] Verified SSL certificate found for ${target_domain}. Writing full HTTPS + WSS config...${NC}"
        cat << NGINX_CONF > /etc/nginx/sites-available/mehdesk.conf
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${target_domain};
    return 301 https://\$host\$request_uri;
}

# Production HTTPS and WebSocket Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${target_domain};

    ssl_certificate ${cert_file};
    ssl_certificate_key ${key_file};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Secure WebSocket Signaling Gateway (/ws)
    location /ws {
        proxy_pass http://127.0.0.1:${current_port};
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
        proxy_pass http://127.0.0.1:${current_port};
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
NGINX_CONF
    else
        echo -e "${YELLOW}[WARN] SSL certificate not found. Configuring HTTP & WebSocket on Port 80...${NC}"
        cat << NGINX_CONF > /etc/nginx/sites-available/mehdesk.conf
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${target_domain};

    location /ws {
        proxy_pass http://127.0.0.1:${current_port};
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
        proxy_pass http://127.0.0.1:${current_port};
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
NGINX_CONF
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

    if [ -f "$cert_file" ]; then
        sed -i "s/DOMAIN=.*/DOMAIN=${target_domain}/" "${INSTALL_DIR}/.env" 2>/dev/null || true
        systemctl restart ${SERVICE_NAME} 2>/dev/null || true
        echo -e "\n${GREEN}🎉 Domain and SSL certificate configured successfully!${NC}"
        echo -e "Access URL: ${CYAN}https://${target_domain}${NC}"
    fi
}

install_mehdesk_core() {
    echo -e "\n${CYAN}${BOLD}[2/4] Cloning meh desk source repository...${NC}"
    
    mkdir -p "${BACKUP_DIR}"

    if [ -d "${INSTALL_DIR}/.git" ]; then
        echo -e "${YELLOW}Existing installation detected. Updating source...${NC}"
        cd "${INSTALL_DIR}"
        git fetch --all
        git reset --hard origin/main || git pull origin main
    else
        rm -rf "${INSTALL_DIR}"
        git clone "${REPO_URL}" "${INSTALL_DIR}"
        cd "${INSTALL_DIR}"
    fi

    echo -e "\n${CYAN}${BOLD}[3/4] Installing dependencies and building production server...${NC}"
    npm install --production=false
    npm run build

    echo -e "\n${CYAN}${BOLD}[4/4] Configuring environment and Systemd daemon...${NC}"
    
    # Prompt for port if fresh install
    if [ ! -f "${ENV_FILE}" ]; then
        echo -e "${WHITE}Specify Web Panel Port (Default: 3000):${NC}"
        read -p "Port [3000]: " USER_PORT
        PORT=${USER_PORT:-3000}

        echo -e "${WHITE}Custom Domain (Optional - press Enter to skip):${NC}"
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

    NODE_BIN=$(command -v node || echo "/usr/bin/node")

    # Create Systemd Service
    cat <<EOF > "/etc/systemd/system/${SERVICE_NAME}.service"
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

    if [ -n "$DOMAIN" ]; then
        setup_domain_ssl "$DOMAIN"
    fi

    # Detect IP
    SERVER_IP=$(get_clean_ip)

    echo -e "\n${GREEN}${BOLD}===================================================================${NC}"
    echo -e "${GREEN}${BOLD}🎉 meh desk successfully installed and running!${NC}"
    echo -e "${GREEN}${BOLD}===================================================================${NC}"
    echo -e " 🌐 Direct IP Web Panel: ${CYAN}${BOLD}http://${SERVER_IP}:${PORT}${NC}"
    if [ -n "$DOMAIN" ]; then
        echo -e " 🔒 Custom Domain (SSL): ${CYAN}${BOLD}https://${DOMAIN}${NC}"
    fi
    echo -e " 🔑 Default Admin Master PIN: ${YELLOW}${BOLD}123456${NC}"
    echo -e " 💻 Terminal Management Command: ${CYAN}${BOLD}mehdesk${NC}"
    echo -e "${YELLOW}-------------------------------------------------------------------${NC}"
    echo -e "${WHITE}Type ${GREEN}mehdesk${WHITE} anywhere in your shell to open the management console.${NC}\n"
}

# Main Interactive Menu Entrypoint
main_interactive_menu() {
    show_logo
    check_root
    detect_os

    # If already installed, show status
    if [ -d "${INSTALL_DIR}" ] && [ -f "${CLI_COMMAND}" ]; then
        if systemctl is-active --quiet ${SERVICE_NAME}; then
            echo -e " Current Status: ${GREEN}● Installed & Running${NC}"
        else
            echo -e " Current Status: ${YELLOW}○ Installed (Stopped)${NC}"
        fi
        echo -e "${YELLOW}-------------------------------------------------------------------${NC}"
    fi

    echo -e "Please choose an action:\n"
    echo -e "  ${GREEN}1)${NC} Install / Reinstall meh desk"
    echo -e "  ${BLUE}2)${NC} Update to Latest Release"
    echo -e "  ${CYAN}3)${NC} Start / Restart Service"
    echo -e "  ${YELLOW}4)${NC} Stop Service"
    echo -e "  ${PURPLE}5)${NC} View Live Logs"
    echo -e "  ${WHITE}6)${NC} Change Listening Port"
    echo -e "  ${CYAN}7)${NC} Configure Domain & SSL Let's Encrypt"
    echo -e "  ${YELLOW}8)${NC} Reset Admin PIN"
    echo -e "  ${MAGENTA}9)${NC} 📦 Build Windows Portable Client (.exe) via Tauri on Linux"
    echo -e "  ${RED}10)${NC} Uninstall meh desk"
    echo -e "  ${BOLD}0)${NC} Exit\n"
    read -p "Select an option [0-10]: " action_choice

    case "$action_choice" in
        1)
            install_dependencies
            install_mehdesk_core
            ;;
        2)
            if [ -d "${INSTALL_DIR}" ]; then
                echo -e "${CYAN}[1/5] Fetching latest updates from GitHub...${NC}"
                cd "${INSTALL_DIR}"
                git fetch --unshallow 2>/dev/null || git fetch --all || true
                
                echo -e "${CYAN}[2/5] Resetting to latest origin/main...${NC}"
                git reset --hard origin/main || git pull origin main --force || true
                
                echo -e "${CYAN}[3/5] Updating dependencies...${NC}"
                npm install --production=false
                
                echo -e "${CYAN}[4/5] Compiling and building distribution bundle...${NC}"
                npm run build
                
                if [ ! -f "${INSTALL_DIR}/dist/server.cjs" ]; then
                    echo -e "${YELLOW}[WARN] dist/server.cjs not found after build. Building server standalone...${NC}"
                    npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs || true
                fi

                create_cli_tool
                
                echo -e "${CYAN}[5/5] Reloading and restarting ${SERVICE_NAME} systemd service...${NC}"
                systemctl daemon-reload
                systemctl restart ${SERVICE_NAME} || systemctl start ${SERVICE_NAME} || true
                
                sleep 2
                if systemctl is-active --quiet ${SERVICE_NAME}; then
                    echo -e "${GREEN}[OK] ${SERVICE_NAME} service is active and running!${NC}"
                else
                    echo -e "${RED}[WARN] Service is not running. Showing journal logs:${NC}"
                    journalctl -u ${SERVICE_NAME} -n 20 --no-pager || true
                fi

                # Automatically detect domain from .env, Nginx configs, or certbot certificates
                local detected_domain=""
                if [ -f "${INSTALL_DIR}/.env" ]; then
                    source "${INSTALL_DIR}/.env"
                    detected_domain="${DOMAIN:-}"
                fi

                if [ -z "$detected_domain" ] && [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
                    detected_domain=$(grep -m 1 "server_name" /etc/nginx/sites-available/mehdesk.conf 2>/dev/null | awk '{print $2}' | tr -d ';')
                fi

                if [ -z "$detected_domain" ] && command -v certbot &>/dev/null; then
                    detected_domain=$(certbot certificates 2>/dev/null | grep "Certificate Name:" | head -n 1 | awk '{print $3}')
                fi

                if command -v nginx &>/dev/null && [ -n "$detected_domain" ] && [ "$detected_domain" != "_" ]; then
                    echo -e "\n${CYAN}[6/6] Auto-refreshing Nginx WebSockets & SSL proxy for '${detected_domain}'...${NC}"
                    setup_domain_ssl "$detected_domain"
                elif command -v nginx &>/dev/null && [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
                    echo -e "\n${CYAN}[6/6] Reloading Nginx reverse proxy...${NC}"
                    nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true
                fi

                echo -e "\n${GREEN}${BOLD}🎉 meh desk update completed successfully! All services & WebSockets updated.${NC}\n"
            else
                echo -e "${YELLOW}meh desk is not installed yet. Running installer...${NC}"
                install_dependencies
                install_mehdesk_core
            fi
            ;;
        3)
            systemctl restart ${SERVICE_NAME}
            echo -e "${GREEN}Service restarted.${NC}"
            ;;
        4)
            systemctl stop ${SERVICE_NAME}
            echo -e "${YELLOW}Service stopped.${NC}"
            ;;
        5)
            journalctl -u ${SERVICE_NAME} -f -n 50
            ;;
        6)
            read -p "Enter new port: " NEW_PORT
            if [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
                sed -i "s/PORT=.*/PORT=${NEW_PORT}/" "${INSTALL_DIR}/.env"
                systemctl restart ${SERVICE_NAME}
                echo -e "${GREEN}Port updated to ${NEW_PORT}.${NC}"
            fi
            ;;
        7)
            read -p "Enter domain (e.g. desk.domain.com): " USER_DOMAIN
            if [ -n "$USER_DOMAIN" ]; then
                setup_domain_ssl "$USER_DOMAIN"
            fi
            ;;
        8)
            read -p "Enter new Admin PIN: " NEW_PIN
            if [ -n "$NEW_PIN" ]; then
                curl -s -X POST "http://127.0.0.1:3000/api/admin/settings" \
                     -H "Content-Type: application/json" \
                     -d "{\"adminPin\":\"${NEW_PIN}\"}" || true
                echo -e "${GREEN}PIN updated to ${NEW_PIN}.${NC}"
            fi
            ;;
        9)
            local target_dir="${INSTALL_DIR}"
            if [ ! -d "$target_dir" ] && [ -f "./package.json" ]; then
                target_dir="$(pwd)"
            fi
            if [ -f "${target_dir}/scripts/build-tauri-windows.sh" ]; then
                bash "${target_dir}/scripts/build-tauri-windows.sh"
            elif [ -f "./scripts/build-tauri-windows.sh" ]; then
                bash "./scripts/build-tauri-windows.sh"
            else
                echo -e "${RED}[ERROR] build-tauri-windows.sh not found.${NC}"
            fi
            ;;
        10)
            read -p "Are you sure you want to remove meh desk? [y/N]: " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                systemctl stop ${SERVICE_NAME} || true
                systemctl disable ${SERVICE_NAME} || true
                rm -f /etc/systemd/system/${SERVICE_NAME}.service
                systemctl daemon-reload
                rm -rf "${INSTALL_DIR}"
                rm -f "${CLI_COMMAND}"
                echo -e "${GREEN}meh desk uninstalled.${NC}"
            fi
            ;;
        0)
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid selection.${NC}"
            exit 1
            ;;
    esac
}

# Run the interactive menu
main_interactive_menu
