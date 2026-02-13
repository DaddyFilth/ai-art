#!/data/data/com.termux/files/usr/bin/bash

# ============================================
# AI Art Revenue Exchange - Health Check
# Check the health of all services
# ============================================

echo "================================="
echo "AI Art Exchange - Health Check"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Status indicators
STATUS_OK="✓"
STATUS_WARN="⚠"
STATUS_ERROR="✗"

print_status() {
    local service=$1
    local status=$2
    local message=$3
    
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}${STATUS_OK}${NC} $service: ${GREEN}$message${NC}"
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}${STATUS_WARN}${NC} $service: ${YELLOW}$message${NC}"
    else
        echo -e "${RED}${STATUS_ERROR}${NC} $service: ${RED}$message${NC}"
    fi
}

# Check PostgreSQL
echo "Checking PostgreSQL..."
if pg_ctl -D $PREFIX/var/lib/postgresql status >/dev/null 2>&1; then
    if psql -d ai_art_exchange -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "PostgreSQL" "ok" "Running and accessible"
    else
        print_status "PostgreSQL" "warn" "Running but database not accessible"
    fi
else
    print_status "PostgreSQL" "error" "Not running"
fi

# Check Redis
echo "Checking Redis..."
if redis-cli ping >/dev/null 2>&1; then
    print_status "Redis" "ok" "Running and responding"
else
    print_status "Redis" "error" "Not running or not responding"
fi

# Check Backend
echo "Checking Backend API..."
BACKEND_PID=$(cat ~/ai-art/logs/backend.pid 2>/dev/null || echo "")
if [ ! -z "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    # Try to connect to backend health endpoint
    if command -v curl >/dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null || echo "")
        if [ ! -z "$HEALTH_RESPONSE" ]; then
            print_status "Backend" "ok" "Running and responding (PID: $BACKEND_PID)"
        else
            print_status "Backend" "warn" "Process running but not responding yet (PID: $BACKEND_PID)"
        fi
    else
        print_status "Backend" "ok" "Process running (PID: $BACKEND_PID)"
    fi
else
    BACKEND_RUNNING=$(pgrep -f "node.*backend.*main.js" || true)
    if [ ! -z "$BACKEND_RUNNING" ]; then
        print_status "Backend" "warn" "Process running but PID file missing"
    else
        print_status "Backend" "error" "Not running"
    fi
fi

# Check Frontend
echo "Checking Frontend..."
FRONTEND_PID=$(cat ~/ai-art/logs/frontend.pid 2>/dev/null || echo "")
if [ ! -z "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
    # Try to connect to frontend
    if command -v curl >/dev/null 2>&1; then
        FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null || echo "000")
        if [ "$FRONTEND_RESPONSE" = "200" ] || [ "$FRONTEND_RESPONSE" = "304" ]; then
            print_status "Frontend" "ok" "Running and responding (PID: $FRONTEND_PID)"
        else
            print_status "Frontend" "warn" "Process running but not responding yet (PID: $FRONTEND_PID)"
        fi
    else
        print_status "Frontend" "ok" "Process running (PID: $FRONTEND_PID)"
    fi
else
    FRONTEND_RUNNING=$(pgrep -f "node.*frontend.*next" || true)
    if [ ! -z "$FRONTEND_RUNNING" ]; then
        print_status "Frontend" "warn" "Process running but PID file missing"
    else
        print_status "Frontend" "error" "Not running"
    fi
fi

echo ""
echo "================================="
echo "Resource Usage"
echo "================================="
echo ""

# Memory usage
if command -v free >/dev/null 2>&1; then
    echo "Memory:"
    free -h | grep -E "Mem:|Swap:"
    echo ""
fi

# Disk usage
echo "Disk Usage (AI Art directory):"
du -sh ~/ai-art 2>/dev/null || echo "N/A"
du -sh ~/ai-art/backend/node_modules 2>/dev/null | sed 's/^/  - Backend modules: /' || true
du -sh ~/ai-art/frontend/node_modules 2>/dev/null | sed 's/^/  - Frontend modules: /' || true
du -sh ~/ai-art/uploads 2>/dev/null | sed 's/^/  - Uploads: /' || true
echo ""

# Process list
echo "Node.js Processes:"
ps aux | grep node | grep -v grep | awk '{print "  PID: " $2 "  CPU: " $3 "%  MEM: " $4 "%  " $11 " " $12 " " $13}'
echo ""

# Database info
echo "Database:"
if psql -d ai_art_exchange -c "SELECT COUNT(*) FROM \"User\";" >/dev/null 2>&1; then
    USER_COUNT=$(psql -d ai_art_exchange -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | xargs)
    echo "  - Users: $USER_COUNT"
fi
echo ""

# Logs
echo "Recent Logs:"
if [ -f ~/ai-art/logs/backend.log ]; then
    echo "Backend (last 3 lines):"
    tail -3 ~/ai-art/logs/backend.log | sed 's/^/  /'
    echo ""
fi

if [ -f ~/ai-art/logs/frontend.log ]; then
    echo "Frontend (last 3 lines):"
    tail -3 ~/ai-art/logs/frontend.log | sed 's/^/  /'
    echo ""
fi

echo "================================="
echo "Access URLs"
echo "================================="
echo ""
echo "  Frontend:     http://localhost:3001"
echo "  Backend API:  http://localhost:3000"
echo "  Health:       http://localhost:3000/health"
echo "  API Docs:     http://localhost:3000/api"
echo ""

# Get local IP for external access
if command -v ifconfig >/dev/null 2>&1; then
    LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    if [ ! -z "$LOCAL_IP" ]; then
        echo "External Access (from same network):"
        echo "  Frontend:     http://$LOCAL_IP:3001"
        echo "  Backend API:  http://$LOCAL_IP:3000"
        echo ""
    fi
fi

echo "================================="
echo "Useful Commands"
echo "================================="
echo ""
echo "  View backend logs:   tail -f ~/ai-art/logs/backend.log"
echo "  View frontend logs:  tail -f ~/ai-art/logs/frontend.log"
echo "  Stop services:       ./stop-termux.sh"
echo "  Restart services:    ./stop-termux.sh && ./start-termux.sh"
echo ""
