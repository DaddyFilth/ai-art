#!/data/data/com.termux/files/usr/bin/bash

# ============================================
# AI Art Revenue Exchange - Stop Services
# Stop all services for Termux deployment
# ============================================

echo "================================="
echo "Stopping AI Art Exchange Services"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux environment"
    exit 1
fi

# Step 1: Stop Frontend
print_info "Stopping Frontend..."
if [ -f ~/ai-art/logs/frontend.pid ]; then
    FRONTEND_PID=$(cat ~/ai-art/logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        sleep 2
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_warn "Frontend didn't stop gracefully, forcing..."
            kill -9 $FRONTEND_PID
        fi
        print_info "Frontend stopped"
        rm ~/ai-art/logs/frontend.pid
    else
        print_warn "Frontend PID not running"
        rm ~/ai-art/logs/frontend.pid
    fi
else
    # Try to find and kill any frontend process
    FRONTEND_PIDS=$(pgrep -f "node.*frontend.*next" || true)
    if [ ! -z "$FRONTEND_PIDS" ]; then
        print_info "Found frontend processes: $FRONTEND_PIDS"
        kill $FRONTEND_PIDS 2>/dev/null || true
        sleep 2
        print_info "Frontend stopped"
    else
        print_warn "Frontend not running"
    fi
fi

# Step 2: Stop Backend
print_info "Stopping Backend..."
if [ -f ~/ai-art/logs/backend.pid ]; then
    BACKEND_PID=$(cat ~/ai-art/logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        sleep 2
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            print_warn "Backend didn't stop gracefully, forcing..."
            kill -9 $BACKEND_PID
        fi
        print_info "Backend stopped"
        rm ~/ai-art/logs/backend.pid
    else
        print_warn "Backend PID not running"
        rm ~/ai-art/logs/backend.pid
    fi
else
    # Try to find and kill any backend process
    BACKEND_PIDS=$(pgrep -f "node.*backend.*main.js" || true)
    if [ ! -z "$BACKEND_PIDS" ]; then
        print_info "Found backend processes: $BACKEND_PIDS"
        kill $BACKEND_PIDS 2>/dev/null || true
        sleep 2
        print_info "Backend stopped"
    else
        print_warn "Backend not running"
    fi
fi

# Step 3: Stop Redis (optional, uncomment if you want to stop Redis)
# print_info "Stopping Redis..."
# redis-cli shutdown 2>/dev/null || print_warn "Redis not running or already stopped"

# Step 4: Stop PostgreSQL (optional, uncomment if you want to stop PostgreSQL)
# print_info "Stopping PostgreSQL..."
# pg_ctl -D $PREFIX/var/lib/postgresql stop || print_warn "PostgreSQL not running or already stopped"

# Note: We keep Redis and PostgreSQL running by default
# as they're lightweight and may be used by other apps
# Uncomment the above sections if you want to stop them too

echo ""
echo "================================="
echo -e "${GREEN}Services Stopped!${NC}"
echo "================================="
echo ""
echo "Stopped:"
echo "  ✓ Backend API"
echo "  ✓ Frontend"
echo ""
echo "Still Running:"
echo "  • PostgreSQL (stop manually with: pg_ctl -D \$PREFIX/var/lib/postgresql stop)"
echo "  • Redis (stop manually with: redis-cli shutdown)"
echo ""
echo "To start services again: ./start-termux.sh"
echo ""
