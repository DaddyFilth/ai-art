#!/data/data/com.termux/files/usr/bin/bash

# ============================================
# AI Art Revenue Exchange - Start Services
# Start all services for Termux deployment
# ============================================

set -e

echo "================================="
echo "Starting AI Art Exchange Services"
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

# Navigate to project directory
cd ~/ai-art

# Set environment variables for Termux
export NODE_OPTIONS="--max-old-space-size=512"
export NODE_ENV=development

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Run ./termux-setup.sh first"
    exit 1
fi

# Source environment variables
print_info "Loading environment variables..."
set -a
source .env
set +a

# Create necessary directories
mkdir -p ~/ai-art/logs
mkdir -p ~/ai-art/redis-data
mkdir -p ~/ai-art/uploads

# Step 1: Start PostgreSQL
print_info "Starting PostgreSQL..."
if pg_ctl -D $PREFIX/var/lib/postgresql status >/dev/null 2>&1; then
    print_warn "PostgreSQL is already running"
else
    pg_ctl -D $PREFIX/var/lib/postgresql -l $PREFIX/var/lib/postgresql/logfile start
    sleep 2
    if pg_ctl -D $PREFIX/var/lib/postgresql status >/dev/null 2>&1; then
        print_info "PostgreSQL started successfully"
    else
        print_error "Failed to start PostgreSQL"
        exit 1
    fi
fi

# Step 2: Start Redis
print_info "Starting Redis..."
if redis-cli ping >/dev/null 2>&1; then
    print_warn "Redis is already running"
else
    redis-server --daemonize yes --dir ~/ai-art/redis-data --port 6379
    sleep 2
    if redis-cli ping >/dev/null 2>&1; then
        print_info "Redis started successfully"
    else
        print_error "Failed to start Redis"
        exit 1
    fi
fi

# Step 3: Start Backend
print_info "Starting Backend API..."

# Check if backend is already running
BACKEND_PID=$(pgrep -f "node.*backend.*main.js" || true)
if [ ! -z "$BACKEND_PID" ]; then
    print_warn "Backend is already running (PID: $BACKEND_PID)"
    print_info "To restart, run ./stop-termux.sh first"
else
    cd ~/ai-art/backend
    
    # Check if build exists
    if [ ! -d "dist" ]; then
        print_warn "Backend not built. Building now..."
        npm run build
    fi
    
    # Start backend in background
    nohup npm run start:prod > ~/ai-art/logs/backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Save PID
    echo $BACKEND_PID > ~/ai-art/logs/backend.pid
    
    sleep 3
    
    # Check if backend started successfully
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        print_info "Backend started successfully (PID: $BACKEND_PID)"
    else
        print_error "Backend failed to start. Check logs: ~/ai-art/logs/backend.log"
        exit 1
    fi
fi

# Step 4: Start Frontend
print_info "Starting Frontend..."

# Check if frontend is already running
FRONTEND_PID=$(pgrep -f "node.*frontend.*next" || true)
if [ ! -z "$FRONTEND_PID" ]; then
    print_warn "Frontend is already running (PID: $FRONTEND_PID)"
    print_info "To restart, run ./stop-termux.sh first"
else
    cd ~/ai-art/frontend
    
    # Check if build exists
    if [ ! -d ".next" ]; then
        print_warn "Frontend not built. Building now..."
        npm run build
    fi
    
    # Start frontend in background
    nohup npm run start > ~/ai-art/logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Save PID
    echo $FRONTEND_PID > ~/ai-art/logs/frontend.pid
    
    sleep 3
    
    # Check if frontend started successfully
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        print_info "Frontend started successfully (PID: $FRONTEND_PID)"
    else
        print_error "Frontend failed to start. Check logs: ~/ai-art/logs/frontend.log"
        exit 1
    fi
fi

echo ""
echo "================================="
echo -e "${GREEN}All Services Started!${NC}"
echo "================================="
echo ""
echo "Service Status:"
echo "  PostgreSQL: Running"
echo "  Redis: Running"
echo "  Backend API: Running (PID: $(cat ~/ai-art/logs/backend.pid 2>/dev/null || echo 'N/A'))"
echo "  Frontend: Running (PID: $(cat ~/ai-art/logs/frontend.pid 2>/dev/null || echo 'N/A'))"
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:3001"
echo "  Backend API: http://localhost:3000"
echo "  Health Check: http://localhost:3000/health"
echo ""
echo "Logs:"
echo "  Backend: ~/ai-art/logs/backend.log"
echo "  Frontend: ~/ai-art/logs/frontend.log"
echo "  PostgreSQL: $PREFIX/var/lib/postgresql/logfile"
echo ""
echo "To check service health: ./termux-health-check.sh"
echo "To stop services: ./stop-termux.sh"
echo ""
