# AI Art Revenue Exchange - Termux Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the AI Art Revenue Exchange platform on Termux (Android terminal environment).

> **Note**: Termux deployment is resource-constrained and intended for development/testing purposes. For production deployment, use a dedicated Linux server.

## Prerequisites

### 1. Install Termux

Download Termux from F-Droid (recommended):
- https://f-droid.org/en/packages/com.termux/

> **Important**: Do NOT use the Google Play Store version as it's outdated and no longer maintained.

### 2. System Requirements

- **Android Version**: 7.0+ (recommended: 10+)
- **Storage**: 10GB+ free space
- **RAM**: 4GB+ device recommended
- **Battery**: Keep device plugged in during deployment

## Quick Start

### Step 1: Initial Termux Setup

```bash
# Update package repositories
pkg update && pkg upgrade -y

# Install required packages
pkg install -y git nodejs python wget proot-distro

# Install Docker alternative (proot-distro with Ubuntu)
proot-distro install ubuntu
```

### Step 2: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/DaddyFilth/ai-art.git
cd ai-art

# Switch to termux deployment branch
git checkout copilot/termux-deployment-branch
```

### Step 3: Run Termux Setup Script

```bash
# Make setup script executable
chmod +x termux-setup.sh

# Run automated setup
./termux-setup.sh
```

The setup script will:
1. Install all required dependencies
2. Configure PostgreSQL and Redis
3. Generate environment variables
4. Initialize the database
5. Set up the application

### Step 4: Start the Application

```bash
# Start all services
./start-termux.sh

# Check service status
./termux-health-check.sh
```

### Step 5: Access the Application

The application will be available at:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Manual Installation

If you prefer to install manually or troubleshoot issues:

### 1. Install Core Dependencies

```bash
# Update packages
pkg update && pkg upgrade -y

# Install Node.js (v20+)
pkg install -y nodejs

# Install PostgreSQL
pkg install -y postgresql

# Initialize PostgreSQL
initdb $PREFIX/var/lib/postgresql

# Start PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql start

# Create database
createdb ai_art_exchange
```

### 2. Install Redis

```bash
# Install Redis
pkg install -y redis

# Start Redis server
redis-server --daemonize yes
```

### 3. Configure Environment

```bash
# Copy Termux environment template
cp .env.termux .env

# Generate secrets
node setup-env.js

# Edit configuration if needed
nano .env
```

### 4. Install Backend Dependencies

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed

# Build backend
npm run build
```

### 5. Install Frontend Dependencies

```bash
cd ../frontend

# Install dependencies
npm install

# Build frontend
npm run build
```

### 6. Start Services

```bash
# Start backend (in background)
cd ~/ai-art/backend
npm run start:prod &

# Start frontend (in background)
cd ~/ai-art/frontend
npm run start &
```

## Termux-Specific Configuration

### Resource Optimization

The Termux environment template (`.env.termux`) includes optimized settings:

```bash
# Reduced rate limits
THROTTLE_TTL=60000
THROTTLE_LIMIT=50

# Smaller connection pool
DATABASE_POOL_SIZE=5

# Reduced cache size
REDIS_MAX_MEMORY=100mb

# Lower worker threads
WEB_CONCURRENCY=1
```

### Storage Management

```bash
# Check available storage
df -h

# Clean npm cache
npm cache clean --force

# Clean build artifacts
cd ~/ai-art
rm -rf backend/dist frontend/.next

# Compact database (run periodically)
psql ai_art_exchange -c "VACUUM FULL;"
```

### Memory Management

```bash
# Monitor memory usage
free -h

# Kill services to free memory
pkill node

# Restart services
./start-termux.sh
```

## AI Service Integration (Optional)

### Install Ollama on Termux

```bash
# Install dependencies
pkg install -y proot-distro

# Install Ubuntu environment
proot-distro install ubuntu
proot-distro login ubuntu

# Inside Ubuntu proot
apt update && apt upgrade -y
curl -fsSL https://ollama.com/install.sh | sh

# Pull LLaVA model (requires ~4GB space)
ollama pull llava

# Run Ollama server
ollama serve
```

### Stable Diffusion (Not Recommended for Termux)

Stable Diffusion requires significant GPU resources and is not practical on most Android devices. Consider:
- Using external API services
- Connecting to a remote Stable Diffusion instance
- Disabling image generation features for Termux deployment

## Networking Configuration

### Access from Other Devices

```bash
# Install termux-api
pkg install -y termux-api

# Get device IP address
ifconfig

# Allow external connections (update .env)
HOST=0.0.0.0
ALLOWED_ORIGINS=http://<your-ip>:3001
```

### Port Forwarding

If you need to access from outside your local network:
1. Configure router port forwarding
2. Update `ALLOWED_ORIGINS` in `.env`
3. Consider using ngrok for temporary public URLs

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors

```bash
# Fix script permissions
chmod +x *.sh

# Fix npm permissions
npm config set prefix ~/npm-global
export PATH=~/npm-global/bin:$PATH
```

#### 2. PostgreSQL Connection Failed

```bash
# Check if PostgreSQL is running
pg_ctl -D $PREFIX/var/lib/postgresql status

# Restart PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql restart

# Check logs
tail -f $PREFIX/var/lib/postgresql/logfile
```

#### 3. Out of Memory Errors

```bash
# Reduce Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=512"

# Restart services with reduced memory
./stop-termux.sh
./start-termux.sh
```

#### 4. Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

#### 5. Database Migration Errors

```bash
# Reset database (WARNING: deletes all data)
dropdb ai_art_exchange
createdb ai_art_exchange

# Run migrations again
cd backend
npx prisma migrate deploy
```

### Performance Optimization

```bash
# Disable unnecessary features in .env
ENABLE_ADS=false
ENABLE_DATA_MONETIZATION=false

# Use production mode
NODE_ENV=production

# Enable database connection pooling
DATABASE_POOL_SIZE=3
```

## Limitations

### Known Limitations on Termux

1. **No Docker Support**: Native Docker is not available on Termux
2. **Resource Constraints**: Limited by Android device specifications
3. **Background Processing**: Android may kill background processes
4. **Storage**: Limited storage capacity
5. **AI Services**: Heavy AI models may not run efficiently
6. **SSL/TLS**: Certificate management is more complex
7. **Performance**: Slower than dedicated servers

### Recommended Use Cases

✅ **Good For:**
- Local development and testing
- Learning and experimentation
- Prototyping features
- Mobile development environment

❌ **Not Recommended For:**
- Production deployment
- High-traffic applications
- Resource-intensive AI processing
- Multiple concurrent users

## Keeping Services Running

### Using Termux:Boot

```bash
# Install termux-boot
pkg install -y termux-boot

# Create boot script
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-aiart.sh
```

Add to `start-aiart.sh`:
```bash
#!/data/data/com.termux/files/usr/bin/bash
cd ~/ai-art
./start-termux.sh
```

Make it executable:
```bash
chmod +x ~/.termux/boot/start-aiart.sh
```

### Using Termux:Wake-Lock

```bash
# Keep device awake
termux-wake-lock

# Release wake lock when done
termux-wake-unlock
```

## Backup and Restore

### Backup Database

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
pg_dump ai_art_exchange > ~/backups/backup-$(date +%Y%m%d).sql

# Backup uploaded files (if any)
tar -czf ~/backups/uploads-$(date +%Y%m%d).tar.gz ~/ai-art/uploads
```

### Restore Database

```bash
# Restore from backup
psql ai_art_exchange < ~/backups/backup-20260213.sql
```

## Updating the Application

```bash
# Stop services
./stop-termux.sh

# Pull latest changes
git pull origin copilot/termux-deployment-branch

# Update dependencies
cd backend && npm install
cd ../frontend && npm install

# Run migrations
cd backend
npx prisma migrate deploy

# Rebuild
npm run build
cd ../frontend
npm run build

# Restart services
cd ~/ai-art
./start-termux.sh
```

## Security Considerations

### Termux-Specific Security

1. **Device Security**: Keep Android device locked with strong password
2. **Network Security**: Avoid public WiFi when running services
3. **Access Control**: Don't expose ports to public internet
4. **Updates**: Keep Termux and packages updated
5. **Backups**: Regular backups to external storage

### Recommended Security Practices

```bash
# Generate strong secrets
node setup-env.js

# Restrict file permissions
chmod 600 .env

# Use local connections only (if not needed externally)
HOST=127.0.0.1
```

## Support and Resources

### Helpful Commands

```bash
# View all running processes
ps aux | grep node

# Monitor resource usage
top

# Check disk usage
du -sh ~/ai-art/*

# View recent logs
journalctl -u termux -n 50
```

### Getting Help

- **Termux Wiki**: https://wiki.termux.com/
- **Termux GitHub**: https://github.com/termux/termux-app
- **Project Issues**: https://github.com/DaddyFilth/ai-art/issues

## Next Steps

After successful deployment:
1. Test core functionality
2. Configure AI services (if supported by your device)
3. Customize settings in `.env`
4. Set up regular backups
5. Monitor resource usage

---

**Note**: This deployment is optimized for Termux/Android environment but has limitations compared to standard Linux servers. For production use, deploy on a dedicated server using the main deployment guide.
