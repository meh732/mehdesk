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

            # If domain is present in .env, automatically repair Nginx & SSL configuration
            if [ -f "${INSTALL_DIR}/.env" ]; then
                source "${INSTALL_DIR}/.env"
                if [ -n "$DOMAIN" ]; then
                    echo -e "\n${CYAN}Detected domain '${DOMAIN}' in .env. Checking & updating Nginx and SSL...${NC}"
                    setup_domain_ssl "$DOMAIN"
                fi
            fi

            echo -e "${GREEN}Update completed successfully.${NC}"
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

    cat << NGINX_CONF > /etc/nginx/sites-available/mehdesk.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${target_domain};

    location / {
        proxy_pass http://127.0.0.1:${current_port};
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
NGINX_CONF

    ln -sf /etc/nginx/sites-available/mehdesk.conf /etc/nginx/sites-enabled/mehdesk.conf
    cp -f /etc/nginx/sites-available/mehdesk.conf /etc/nginx/conf.d/mehdesk.conf 2>/dev/null || true

    # Open firewall ports for HTTP & HTTPS
    if command -v ufw >/dev/null 2>&1; then
        ufw allow 80/tcp || true
        ufw allow 443/tcp || true
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-service=http || true
        firewall-cmd --permanent --add-service=https || true
        firewall-cmd --reload || true
    fi

    if nginx -t >/dev/null 2>&1; then
        systemctl restart nginx || systemctl reload nginx
        systemctl enable nginx 2>/dev/null || true
        echo -e "${GREEN}[OK] Nginx reverse proxy configured and active.${NC}"
    else
        echo -e "${RED}[ERROR] Nginx test failed. Restarting anyway...${NC}"
        systemctl restart nginx 2>/dev/null || true
    fi

    echo -e "${CYAN}[SSL] Requesting / Re-linking Let's Encrypt SSL certificate for ${target_domain}...${NC}"
    if certbot --nginx -d "${target_domain}" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring; then
        sed -i "s/DOMAIN=.*/DOMAIN=${target_domain}/" "${INSTALL_DIR}/.env"
        systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
        systemctl restart ${SERVICE_NAME} 2>/dev/null || true
        echo -e "\n${GREEN}🎉 Domain and SSL certificate configured successfully!${NC}"
        echo -e "Access URL: ${CYAN}https://${target_domain}${NC}"
    else
        echo -e "\n${YELLOW}[INFO] Let's Encrypt automated challenge could not complete right now.${NC}"
        echo -e "${YELLOW}HTTP Reverse proxy is already active on http://${target_domain}${NC}"
        echo -e "${YELLOW}Ensure DNS A-Record points to this IP and Cloudflare proxy is off, then run SSL setup again.${NC}"
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

    if [ -n "$DOMAIN" ]; then
        setup_domain_ssl "$DOMAIN"
    fi

    # Detect IP
    SERVER_IP=$(curl -s4 icanhazip.com || curl -s4 ifconfig.me || hostname -I | awk '{print $1}')

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
    echo -e "  ${RED}9)${NC} Uninstall meh desk"
    echo -e "  ${BOLD}0)${NC} Exit\n"
    read -p "Select an option [0-9]: " action_choice

    case "$action_choice" in
        1)
            install_dependencies
            install_mehdesk_core
            ;;
        2)
            if [ -d "${INSTALL_DIR}" ]; then
                echo -e "${CYAN}Pulling latest updates...${NC}"
                cd "${INSTALL_DIR}"
                git fetch --all
                git reset --hard origin/main || git pull origin main
                npm install --production=false
                npm run build
                create_cli_tool
                systemctl restart ${SERVICE_NAME}

                # Automatically configure & link Nginx & SSL if domain is present in .env
                if [ -f "${INSTALL_DIR}/.env" ]; then
                    source "${INSTALL_DIR}/.env"
                    if [ -n "$DOMAIN" ]; then
                        echo -e "\n${CYAN}Detected domain '${DOMAIN}' in .env. Updating Nginx & SSL configuration...${NC}"
                        setup_domain_ssl "$DOMAIN"
                    fi
                fi

                echo -e "${GREEN}Update completed successfully.${NC}"
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
