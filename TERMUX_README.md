# AI Art Revenue Exchange - Termux Deployment Branch

This branch is specifically configured for deployment on **Termux** (Android terminal environment).

## 🤖 What is Termux?

Termux is an Android terminal emulator and Linux environment app that works directly with no rooting or setup required. It allows you to run a full Linux distribution on your Android device.

## 🚀 Quick Start

### Prerequisites
- Android 7.0+ device (recommended: Android 10+)
- 10GB+ free storage
- 4GB+ RAM recommended
- Install Termux from F-Droid: https://f-droid.org/en/packages/com.termux/

### Installation

1. **Open Termux and run:**
   ```bash
   # Update packages
   pkg update && pkg upgrade -y
   
   # Install git
   pkg install -y git
   
   # Clone this repository
   cd ~
   git clone https://github.com/DaddyFilth/ai-art.git
   cd ai-art
   
   # Switch to termux deployment branch
   git checkout copilot/termux-deployment-branch
   
   # Run automated setup
   chmod +x termux-setup.sh
   ./termux-setup.sh
   ```

2. **Start the application:**
   ```bash
   ./start-termux.sh
   ```

3. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

## 📋 What's Different in This Branch?

This Termux deployment branch includes:

### ✅ Termux-Specific Files
- `termux-setup.sh` - Automated setup script for Termux
- `start-termux.sh` - Start all services
- `stop-termux.sh` - Stop all services
- `termux-health-check.sh` - Check service health
- `.env.termux` - Termux-optimized environment template
- `docs/TERMUX_DEPLOYMENT.md` - Comprehensive deployment guide

### ✅ Optimizations for Termux
- **No Docker Required** - Uses native PostgreSQL and Redis
- **Reduced Resource Usage** - Optimized for mobile devices
- **Local File Storage** - Uses device storage instead of S3
- **Simplified Dependencies** - Only essential packages
- **Lower Memory Limits** - Configured for 512MB-1GB RAM
- **Reduced Rate Limits** - Optimized for single-user testing

### ✅ Pre-configured Services
- PostgreSQL 16 (native Termux package)
- Redis 7 (native Termux package)
- Node.js 20+ (native Termux package)
- All dependencies managed by npm

## 📚 Documentation

- **[Termux Deployment Guide](docs/TERMUX_DEPLOYMENT.md)** - Complete deployment instructions
- **[Main README](README.md)** - General project documentation
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Environment setup details

## 🔧 Common Commands

```bash
# Start services
./start-termux.sh

# Stop services
./stop-termux.sh

# Check health
./termux-health-check.sh

# View backend logs
tail -f ~/ai-art/logs/backend.log

# View frontend logs
tail -f ~/ai-art/logs/frontend.log

# Restart services
./stop-termux.sh && ./start-termux.sh

# Update application
git pull origin copilot/termux-deployment-branch
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
cd .. && ./start-termux.sh
```

## ⚙️ Configuration

### Environment Variables
Edit `.env` to customize your deployment:
```bash
nano .env
```

Key settings:
- `PORT=3000` - Backend API port
- `FRONTEND_PORT=3001` - Frontend port
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `NODE_OPTIONS` - Memory limits

### Resource Limits
The default configuration is optimized for devices with 4GB RAM:
- Node.js memory: 512MB
- Database connections: 5
- Redis memory: 100MB
- Web workers: 1

## ⚠️ Limitations

### What Works
✅ Full backend API
✅ Frontend UI
✅ Database operations
✅ User authentication
✅ Token system
✅ File uploads (local storage)

### What's Limited
⚠️ AI generation (requires heavy models)
⚠️ Payment processing (needs Stripe setup)
⚠️ S3 storage (uses local storage instead)
⚠️ Background jobs (limited by Android)

### Not Recommended
❌ Production deployment
❌ Multiple concurrent users
❌ Heavy AI model processing
❌ Large file storage

## 🎯 Use Cases

This Termux deployment is ideal for:

- **Development & Testing** - Test features on mobile
- **Learning** - Learn the platform architecture
- **Prototyping** - Quick prototypes and demos
- **Mobile Development** - Develop on-the-go

## 🐛 Troubleshooting

### Services won't start
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Kill processes
pkill node

# Restart
./start-termux.sh
```

### Out of memory
```bash
# Reduce memory in .env
NODE_OPTIONS=--max-old-space-size=256

# Clear caches
npm cache clean --force
```

### Database errors
```bash
# Restart PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql restart

# Reset database (WARNING: deletes data)
dropdb ai_art_exchange
createdb ai_art_exchange
cd backend && npx prisma migrate deploy
```

### Need more help?
See the comprehensive troubleshooting guide in [docs/TERMUX_DEPLOYMENT.md](docs/TERMUX_DEPLOYMENT.md)

## 📱 Keeping Services Running

### Using Termux:Boot
Automatically start services on device boot:

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
chmod +x ~/.termux/boot/start-aiart.sh
```

### Using Wake Lock
Keep device awake to prevent service termination:
```bash
termux-wake-lock
```

## 🔄 Updates

To update to the latest version:
```bash
cd ~/ai-art
./stop-termux.sh
git pull origin copilot/termux-deployment-branch
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
cd .. && ./start-termux.sh
```

## 🔐 Security

- Keep your device locked with strong password
- Don't expose services to public internet
- Use local connections only (127.0.0.1)
- Keep Termux and packages updated
- Back up data regularly

## 💾 Backup

```bash
# Backup database
pg_dump ai_art_exchange > ~/backups/backup-$(date +%Y%m%d).sql

# Backup configuration
cp .env ~/backups/.env-$(date +%Y%m%d)

# Backup uploads
tar -czf ~/backups/uploads-$(date +%Y%m%d).tar.gz ~/ai-art/uploads
```

## 🆘 Support

- **Issues**: https://github.com/DaddyFilth/ai-art/issues
- **Termux Wiki**: https://wiki.termux.com/
- **Documentation**: [docs/TERMUX_DEPLOYMENT.md](docs/TERMUX_DEPLOYMENT.md)

## 📄 License

Proprietary - All Rights Reserved

---

**⚡ Enjoy AI Art Exchange on your Android device!**

For production deployment, use the main branch with Docker deployment.
