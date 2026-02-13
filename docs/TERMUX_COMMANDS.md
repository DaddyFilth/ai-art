# Termux Deployment - Quick Command Reference

Quick reference for common Termux deployment commands.

## Initial Setup

```bash
# First time setup
pkg update && pkg upgrade -y
pkg install -y git
cd ~
git clone https://github.com/DaddyFilth/ai-art.git
cd ai-art
git checkout copilot/termux-deployment-branch
chmod +x termux-setup.sh
./termux-setup.sh
```

## Service Management

```bash
# Start all services
./start-termux.sh

# Stop all services
./stop-termux.sh

# Check service health
./termux-health-check.sh

# Restart services
./stop-termux.sh && ./start-termux.sh
```

## Database Operations

```bash
# Connect to database
psql ai_art_exchange

# Check database status
pg_ctl -D $PREFIX/var/lib/postgresql status

# Start PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql -l $PREFIX/var/lib/postgresql/logfile start

# Stop PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql stop

# Restart PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql restart

# Backup database
pg_dump ai_art_exchange > ~/backup-$(date +%Y%m%d).sql

# Restore database
psql ai_art_exchange < ~/backup-20260213.sql

# Reset database (WARNING: deletes all data)
dropdb ai_art_exchange
createdb ai_art_exchange
cd backend && npx prisma migrate deploy
```

## Redis Operations

```bash
# Check Redis status
redis-cli ping

# Start Redis
redis-server --daemonize yes --dir ~/ai-art/redis-data --port 6379

# Stop Redis
redis-cli shutdown

# Connect to Redis
redis-cli

# Clear Redis cache
redis-cli FLUSHALL
```

## Application Management

```bash
# View backend logs
tail -f ~/ai-art/logs/backend.log

# View frontend logs
tail -f ~/ai-art/logs/frontend.log

# Clear logs
> ~/ai-art/logs/backend.log
> ~/ai-art/logs/frontend.log

# Rebuild backend
cd ~/ai-art/backend
npm install
npm run build

# Rebuild frontend
cd ~/ai-art/frontend
npm install
npm run build

# Run backend migrations
cd ~/ai-art/backend
npx prisma migrate deploy

# Generate Prisma client
cd ~/ai-art/backend
npx prisma generate

# Seed database
cd ~/ai-art/backend
npx prisma db seed
```

## Process Management

```bash
# Find Node processes
ps aux | grep node

# Find backend process
pgrep -f "node.*backend"

# Find frontend process
pgrep -f "node.*frontend"

# Kill specific process by PID
kill <PID>

# Force kill process
kill -9 <PID>

# Kill all node processes (CAREFUL!)
pkill node
```

## Resource Monitoring

```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check AI Art directory size
du -sh ~/ai-art

# Monitor system resources
top

# Check running processes
ps aux

# Check network connections
netstat -tulpn
```

## Package Management

```bash
# Update all packages
pkg update && pkg upgrade -y

# Install package
pkg install <package-name>

# Remove package
pkg uninstall <package-name>

# Search for package
pkg search <package-name>

# List installed packages
pkg list-installed

# Clean package cache
pkg clean
```

## Git Operations

```bash
# Pull latest changes
cd ~/ai-art
git pull origin copilot/termux-deployment-branch

# Check current branch
git branch

# Check status
git status

# View recent changes
git log --oneline -5

# Discard local changes
git reset --hard HEAD
```

## Network & Access

```bash
# Get device IP address
ifconfig

# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Test backend endpoint
curl http://localhost:3000/health

# Test frontend
curl http://localhost:3001

# Keep device awake
termux-wake-lock

# Release wake lock
termux-wake-unlock
```

## Configuration

```bash
# Edit environment variables
nano .env

# View environment variables
cat .env

# Regenerate secrets
node setup-env.js

# Copy Termux template
cp .env.termux .env
```

## Backup & Restore

```bash
# Full backup
mkdir -p ~/backups
pg_dump ai_art_exchange > ~/backups/db-$(date +%Y%m%d).sql
cp .env ~/backups/.env-$(date +%Y%m%d)
tar -czf ~/backups/uploads-$(date +%Y%m%d).tar.gz ~/ai-art/uploads

# Quick database backup
pg_dump ai_art_exchange > ~/backup.sql

# Restore database
psql ai_art_exchange < ~/backup.sql

# Restore uploads
tar -xzf ~/backups/uploads-20260213.tar.gz -C ~/
```

## Troubleshooting

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
cd ~/ai-art/backend
rm -rf node_modules
npm install

# Check for port conflicts
lsof -i :3000
lsof -i :3001

# Free up disk space
npm cache clean --force
pkg clean
rm -rf ~/ai-art/backend/.next
rm -rf ~/ai-art/frontend/.next

# Fix permissions
chmod +x ~/ai-art/*.sh

# Reset everything (CAREFUL!)
./stop-termux.sh
dropdb ai_art_exchange
createdb ai_art_exchange
cd ~/ai-art/backend
npx prisma migrate deploy
npx prisma db seed
cd ~/ai-art
./start-termux.sh
```

## Performance Optimization

```bash
# Set Node memory limit (in .env)
NODE_OPTIONS=--max-old-space-size=512

# Reduce worker processes (in .env)
WEB_CONCURRENCY=1

# Clear old logs
find ~/ai-art/logs -name "*.log" -mtime +7 -delete

# Compact database
psql ai_art_exchange -c "VACUUM FULL;"

# Clear Redis cache
redis-cli FLUSHALL
```

## Useful Aliases

Add these to `~/.bashrc` for quick access:

```bash
# Add to ~/.bashrc
alias aiart='cd ~/ai-art'
alias aistart='cd ~/ai-art && ./start-termux.sh'
alias aistop='cd ~/ai-art && ./stop-termux.sh'
alias aihealth='cd ~/ai-art && ./termux-health-check.sh'
alias ailogs='tail -f ~/ai-art/logs/backend.log'
alias airestart='cd ~/ai-art && ./stop-termux.sh && ./start-termux.sh'

# Then reload: source ~/.bashrc
```

## Emergency Commands

```bash
# Everything is broken - full reset
./stop-termux.sh
dropdb ai_art_exchange
createdb ai_art_exchange
cd ~/ai-art/backend
rm -rf node_modules dist
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
cd ../frontend
rm -rf node_modules .next
npm install
npm run build
cd ~/ai-art
./start-termux.sh

# Out of memory - kill everything
pkill node
redis-cli shutdown
pg_ctl -D $PREFIX/var/lib/postgresql stop

# Restart from clean state
pg_ctl -D $PREFIX/var/lib/postgresql start
redis-server --daemonize yes
cd ~/ai-art && ./start-termux.sh
```

## Quick Access URLs

```bash
# Frontend
http://localhost:3001

# Backend API
http://localhost:3000

# Health Check
http://localhost:3000/health

# API Documentation (if enabled)
http://localhost:3000/api

# Prisma Studio
cd ~/ai-art/backend && npx prisma studio
# Then access: http://localhost:5555
```

## Auto-Start on Boot

```bash
# Install termux-boot
pkg install -y termux-boot

# Create boot script
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-aiart.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/ai-art
./start-termux.sh
EOF

# Make executable
chmod +x ~/.termux/boot/start-aiart.sh

# Enable wake lock in boot script
cat > ~/.termux/boot/wake-lock.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
EOF

chmod +x ~/.termux/boot/wake-lock.sh
```

## File Locations

```bash
# Application
~/ai-art/                           # Main directory

# Logs
~/ai-art/logs/backend.log           # Backend logs
~/ai-art/logs/frontend.log          # Frontend logs
~/ai-art/logs/backend.pid           # Backend PID
~/ai-art/logs/frontend.pid          # Frontend PID

# Database
$PREFIX/var/lib/postgresql/         # PostgreSQL data
$PREFIX/var/lib/postgresql/logfile  # PostgreSQL logs

# Redis
~/ai-art/redis-data/                # Redis data

# Uploads
~/ai-art/uploads/                   # User uploads

# Configuration
~/ai-art/.env                       # Environment config
```

---

## Getting Help

- Full Guide: `cat ~/ai-art/docs/TERMUX_DEPLOYMENT.md`
- Quick Ref: `cat ~/ai-art/TERMUX_README.md`
- Health Check: `./termux-health-check.sh`
- Logs: `tail -f ~/ai-art/logs/backend.log`

## Most Common Commands

```bash
# Daily use
./start-termux.sh          # Start
./stop-termux.sh           # Stop  
./termux-health-check.sh   # Status

# Troubleshooting
tail -f ~/ai-art/logs/backend.log   # View logs
./stop-termux.sh && ./start-termux.sh  # Restart

# Updates
cd ~/ai-art
git pull origin copilot/termux-deployment-branch
./stop-termux.sh
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
cd .. && ./start-termux.sh
```

---

**💡 Tip**: Bookmark this file or add aliases to your `~/.bashrc` for quick access!
