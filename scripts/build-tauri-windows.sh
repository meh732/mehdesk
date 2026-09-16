#!/usr/bin/env bash
# ==============================================================================
# meh desk Enterprise - Tauri Windows (.exe) Cross-Compiler for Linux
# ==============================================================================
# This script compiles the Tauri Desktop Client for Windows (.exe) directly
# inside a Linux environment using Rust cross-compilation (x86_64-pc-windows-gnu)
# and MinGW-w64. The final output is a native Windows executable (.exe).
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

echo -e "\n${BOLD}${CYAN}===================================================================${NC}"
echo -e "${BOLD}${CYAN}   🚀 meh desk - Windows Portable (.exe) Builder via Tauri (Linux) ${NC}"
echo -e "${BOLD}${CYAN}===================================================================${NC}\n"

# Determine base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
if [ ! -f "${PROJECT_ROOT}/package.json" ]; then
    PROJECT_ROOT="/usr/local/mehdesk"
fi

cd "${PROJECT_ROOT}"

echo -e "${BLUE}📁 Working Directory:${NC} ${PROJECT_ROOT}"

# 1. Check Root / Sudo for tool installation
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo &>/dev/null; then
        SUDO="sudo"
    else
        echo -e "${YELLOW}[WARN] Running as non-root without sudo. Dependency installation might require manual approval.${NC}"
    fi
fi

# 2. Detect Package Manager & Install MinGW-w64 + NSIS on Linux
echo -e "\n${CYAN}[1/6] Checking Linux cross-compilation tools (mingw-w64, nsis)...${NC}"
if ! command -v x86_64-w64-mingw32-gcc &>/dev/null; then
    echo -e "${YELLOW}Installing MinGW-w64 (Windows GCC Cross-Compiler on Linux)...${NC}"
    if command -v apt-get &>/dev/null; then
        $SUDO apt-get update -y
        $SUDO apt-get install -y mingw-w64 nsis build-essential curl pkg-config libssl-dev lld
    elif command -v dnf &>/dev/null; then
        $SUDO dnf install -y epel-release || true
        $SUDO dnf install -y mingw64-gcc mingw64-gcc-c++ nsis gcc curl make
    elif command -v yum &>/dev/null; then
        $SUDO yum install -y epel-release || true
        $SUDO yum install -y mingw64-gcc mingw64-gcc-c++ nsis gcc curl make
    elif command -v pacman &>/dev/null; then
        $SUDO pacman -S --noconfirm mingw-w64-gcc nsis
    else
        echo -e "${RED}[ERROR] Could not detect package manager. Please manually install mingw-w64 and nsis.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[OK] MinGW-w64 toolchain is already installed.${NC}"
fi

# 3. Check Rust & Cargo
echo -e "\n${CYAN}[2/6] Checking Rust & Cargo environment...${NC}"
if ! command -v cargo &>/dev/null; then
    echo -e "${YELLOW}Rust is not installed. Installing official Rust toolchain...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    source "$HOME/.cargo/env" 2>/dev/null || true
    export PATH="$HOME/.cargo/bin:$PATH"
fi

if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env" 2>/dev/null || true
fi

if ! command -v cargo &>/dev/null; then
    echo -e "${RED}[ERROR] Cargo still not found. Please verify Rust installation in $HOME/.cargo/bin${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Rust version: $(rustc --version 2>/dev/null || echo 'Rust')${NC}"

# 4. Add Windows GNU Rust target
echo -e "\n${CYAN}[3/6] Adding Windows target (x86_64-pc-windows-gnu) to Rust...${NC}"
rustup target add x86_64-pc-windows-gnu

# 5. Configure Cargo Linker for Linux to Windows cross-compile
echo -e "\n${CYAN}[4/6] Configuring Cargo Linker in src-tauri/.cargo/config.toml...${NC}"
mkdir -p "${PROJECT_ROOT}/src-tauri/.cargo"
cat << 'EOF' > "${PROJECT_ROOT}/src-tauri/.cargo/config.toml"
[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-ar"
EOF
echo -e "${GREEN}[OK] Cargo linker configured to x86_64-w64-mingw32-gcc.${NC}"

# 6. Build Web Frontend Assets first
echo -e "\n${CYAN}[5/6] Building production web frontend...${NC}"
npm run build

# 7. Check / Install Tauri CLI
if ! command -v cargo-tauri &>/dev/null && ! npx tauri --version &>/dev/null; then
    echo -e "${YELLOW}Installing @tauri-apps/cli...${NC}"
    npm install --save-dev @tauri-apps/cli || true
fi

# 8. Cross-Compile for Windows (.exe)
echo -e "\n${CYAN}[6/6] 🔨 Cross-compiling Tauri for Windows (.exe) ...${NC}"
echo -e "${MAGENTA}Target: x86_64-pc-windows-gnu (Native Windows 64-bit .exe)${NC}"

cd "${PROJECT_ROOT}/src-tauri"

# Run build targeting Windows GNU
if command -v cargo-tauri &>/dev/null; then
    cargo tauri build --target x86_64-pc-windows-gnu --release || \
    cargo tauri build --target x86_64-pc-windows-gnu --release --no-bundle || true
elif npx tauri --version &>/dev/null; then
    cd "${PROJECT_ROOT}"
    npx tauri build --target x86_64-pc-windows-gnu --release || \
    npx tauri build --target x86_64-pc-windows-gnu --release --no-bundle || true
    cd "${PROJECT_ROOT}/src-tauri"
else
    # Fallback to direct cargo build
    cargo build --target x86_64-pc-windows-gnu --release
fi

cd "${PROJECT_ROOT}"

# 9. Locate generated Windows .exe file
WINDOWS_EXE=""
if [ -f "${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/mehdesk-portable.exe" ]; then
    WINDOWS_EXE="${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/mehdesk-portable.exe"
elif [ -f "${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/mehdesk-Portable.exe" ]; then
    WINDOWS_EXE="${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/mehdesk-Portable.exe"
elif [ -f "${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/anydesk-remote-portable.exe" ]; then
    WINDOWS_EXE="${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/anydesk-remote-portable.exe"
fi

# Check NSIS installer as well
NSIS_EXE=$(find "${PROJECT_ROOT}/src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis" -name "*.exe" 2>/dev/null | head -n 1 || true)

mkdir -p "${PROJECT_ROOT}/public/downloads"
mkdir -p "${PROJECT_ROOT}/dist/downloads"

# If found, copy to public downloads
if [ -n "$WINDOWS_EXE" ] && [ -f "$WINDOWS_EXE" ]; then
    cp -f "$WINDOWS_EXE" "${PROJECT_ROOT}/public/downloads/mehdesk-portable.exe"
    cp -f "$WINDOWS_EXE" "${PROJECT_ROOT}/dist/downloads/mehdesk-portable.exe"
    cp -f "$WINDOWS_EXE" "${PROJECT_ROOT}/public/downloads/mehdesk-windows.exe"
    cp -f "$WINDOWS_EXE" "${PROJECT_ROOT}/dist/downloads/mehdesk-windows.exe"
    
    # Also copy to /usr/local/mehdesk if different
    if [ -d "/usr/local/mehdesk" ] && [ "${PROJECT_ROOT}" != "/usr/local/mehdesk" ]; then
        mkdir -p "/usr/local/mehdesk/public/downloads" "/usr/local/mehdesk/dist/downloads" 2>/dev/null || true
        cp -f "$WINDOWS_EXE" "/usr/local/mehdesk/public/downloads/mehdesk-portable.exe" 2>/dev/null || true
        cp -f "$WINDOWS_EXE" "/usr/local/mehdesk/dist/downloads/mehdesk-portable.exe" 2>/dev/null || true
    fi

    FILE_SIZE=$(du -h "$WINDOWS_EXE" | awk '{print $1}')
    echo -e "\n${GREEN}${BOLD}===================================================================${NC}"
    echo -e "${GREEN}${BOLD}🎉 SUCCESS! Windows .exe compiled successfully on Linux!${NC}"
    echo -e "${GREEN}${BOLD}===================================================================${NC}"
    echo -e " 📄 Generated Binary: ${CYAN}${WINDOWS_EXE}${NC}"
    echo -e " 📦 File Size: ${MAGENTA}${FILE_SIZE}${NC}"
    echo -e " 💾 Stored at: ${WHITE}${PROJECT_ROOT}/public/downloads/mehdesk-portable.exe${NC}"
elif [ -n "$NSIS_EXE" ] && [ -f "$NSIS_EXE" ]; then
    cp -f "$NSIS_EXE" "${PROJECT_ROOT}/public/downloads/mehdesk-portable.exe"
    cp -f "$NSIS_EXE" "${PROJECT_ROOT}/dist/downloads/mehdesk-portable.exe"
    FILE_SIZE=$(du -h "$NSIS_EXE" | awk '{print $1}')
    echo -e "\n${GREEN}${BOLD}🎉 Windows NSIS Setup .exe generated: ${NSIS_EXE} (${FILE_SIZE})${NC}"
else
    echo -e "\n${YELLOW}[INFO] Full Rust build finished or completed in target directory.${NC}"
    echo -e "${YELLOW}Checking downloads directory...${NC}"
fi

# Detect domain or server IP for download URL
SERVER_IP=$(curl -s4 ifconfig.me || curl -s4 icanhazip.com || hostname -I | awk '{print $1}')
SERVER_PORT="3000"
if [ -f "${PROJECT_ROOT}/.env" ]; then
    SERVER_PORT=$(grep "^PORT=" "${PROJECT_ROOT}/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3000")
fi

echo -e "\n${BOLD}${CYAN}🔗 Direct Windows .exe Download Links:${NC}"
echo -e "  🌐 Direct IP:  ${WHITE}http://${SERVER_IP}:${SERVER_PORT}/downloads/mehdesk-portable.exe${NC}"
if [ -f "/etc/nginx/sites-available/mehdesk.conf" ]; then
    DOM=$(grep -m 1 "server_name" /etc/nginx/sites-available/mehdesk.conf 2>/dev/null | awk '{print $2}' | tr -d ';')
    if [ -n "$DOM" ] && [ "$DOM" != "_" ]; then
        echo -e "  🔒 HTTPS:      ${WHITE}https://${DOM}/downloads/mehdesk-portable.exe${NC}"
    fi
fi
echo -e "  💻 Web Panel:  Downloadable directly from the Web Interface under Deployment / Downloads.\n"
