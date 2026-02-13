#!/data/data/com.termux/files/usr/bin/bash

# ============================================
# AI Art Revenue Exchange - Termux Setup
# Automated setup script for Termux deployment
# ============================================

set -e  # Exit on error

echo "================================="
echo "AI Art Exchange - Termux Setup"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "This script must be run in Termux environment"
    exit 1
fi

print_info "Starting Termux setup..."
echo ""

# Step 1: Update packages
print_info "Step 1/8: Updating packages..."
pkg update -y && pkg upgrade -y

# Step 2: Install core dependencies
print_info "Step 2/8: Installing core dependencies..."
pkg install -y \
    git \
    nodejs \
    python \
    postgresql \
    redis \
    wget \
    openssh \
    termux-services

# Step 3: Initialize PostgreSQL
print_info "Step 3/8: Initializing PostgreSQL..."

if [ ! -d "$PREFIX/var/lib/postgresql" ]; then
    print_info "Creating PostgreSQL database cluster..."
    initdb $PREFIX/var/lib/postgresql
else
    print_info "PostgreSQL already initialized"
fi

# Start PostgreSQL
print_info "Starting PostgreSQL..."
pg_ctl -D $PREFIX/var/lib/postgresql -l $PREFIX/var/lib/postgresql/logfile start

# Wait for PostgreSQL to start
sleep 3

# Create database
print_info "Creating database..."
createdb ai_art_exchange 2>/dev/null || print_warn "Database already exists"

# Create database user (if needed)
psql -d ai_art_exchange -c "SELECT 1;" >/dev/null 2>&1 || print_error "Failed to connect to database"

# Step 4: Start Redis
print_info "Step 4/8: Starting Redis..."
redis-server --daemonize yes --dir $HOME/ai-art/redis-data --port 6379

# Wait for Redis to start
sleep 2

# Test Redis connection
redis-cli ping >/dev/null 2>&1 && print_info "Redis is running" || print_error "Redis failed to start"

# Step 5: Configure environment
print_info "Step 5/8: Configuring environment..."

if [ ! -f ".env" ]; then
    print_info "Creating .env from Termux template..."
    cp .env.termux .env
    
    # Generate secrets using Node.js
    if [ -f "setup-env.js" ]; then
        print_info "Generating secure secrets..."
        node setup-env.js
    else
        print_warn "setup-env.js not found, using template values"
    fi
else
    print_warn ".env already exists, skipping..."
fi

# Create necessary directories
print_info "Creating directories..."
mkdir -p ~/ai-art/uploads
mkdir -p ~/ai-art/logs
mkdir -p ~/ai-art/redis-data

# Step 6: Install backend dependencies
print_info "Step 6/8: Installing backend dependencies..."
cd backend

if [ ! -d "node_modules" ]; then
    print_info "Installing backend npm packages (this may take a while)..."
    npm install --production=false
else
    print_info "Backend dependencies already installed"
fi

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate

# Run database migrations
print_info "Running database migrations..."
npx prisma migrate deploy || print_warn "Migration failed, trying reset..."

# If migration fails, try reset (for fresh install)
if [ $? -ne 0 ]; then
    print_warn "Trying database reset..."
    npx prisma migrate reset --force
fi

# Seed database
print_info "Seeding database..."
npx prisma db seed || print_warn "Seeding failed or already seeded"

# Build backend
print_info "Building backend..."
npm run build

cd ..

# Step 7: Install frontend dependencies
print_info "Step 7/8: Installing frontend dependencies..."
cd frontend

if [ ! -d "node_modules" ]; then
    print_info "Installing frontend npm packages (this may take a while)..."
    npm install --production=false
else
    print_info "Frontend dependencies already installed"
fi

# Build frontend
print_info "Building frontend..."
npm run build

cd ..

# Step 8: Create helper scripts
print_info "Step 8/8: Creating helper scripts..."

# Make scripts executable
chmod +x start-termux.sh 2>/dev/null || print_warn "start-termux.sh not found"
chmod +x stop-termux.sh 2>/dev/null || print_warn "stop-termux.sh not found"
chmod +x termux-health-check.sh 2>/dev/null || print_warn "termux-health-check.sh not found"

# Final setup
print_info "Final setup steps..."

# Set Node.js memory limit for Termux
export NODE_OPTIONS="--max-old-space-size=512"

echo ""
echo "================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================="
echo ""
echo "Next steps:"
echo "1. Review .env file and adjust settings if needed:"
echo "   nano .env"
echo ""
echo "2. Start the application:"
echo "   ./start-termux.sh"
echo ""
echo "3. Check service health:"
echo "   ./termux-health-check.sh"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:3001"
echo "   Backend API: http://localhost:3000"
echo "   Health: http://localhost:3000/health"
echo ""
echo "For more information, see:"
echo "   docs/TERMUX_DEPLOYMENT.md"
echo ""
print_info "Enjoy AI Art Exchange on Termux!"
echo ""
