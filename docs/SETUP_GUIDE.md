# Automated Environment Setup Guide

## Overview

The AI Art Exchange platform includes automated environment configuration scripts that generate secure `.env` files with random secrets and sensible defaults.

## Available Setup Scripts

### 1. Node.js Script (Cross-platform)
```bash
node setup-env.js
```
**Recommended** - Works on Windows, macOS, and Linux

### 2. Bash Script (Unix/Linux/macOS)
```bash
./setup-env.sh
```
Requires bash and OpenSSL

### 3. NPM Script (from backend directory)
```bash
cd backend
npm run setup
```

---

## Quick Start

### Option 1: Using Node.js (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd ai-art

# Run the setup script
node setup-env.js

# Follow the prompts:
# - Select environment type (1 for development, 2 for production)
# - Script will generate .env with secure random secrets
```

### Option 2: Using Bash Script

```bash
# Make executable (if not already)
chmod +x setup-env.sh

# Run the script
./setup-env.sh

# Follow the prompts
```

---

## What the Script Does

### 1. **Checks for Existing .env**
- If `.env` exists, prompts for confirmation before overwriting
- Creates a backup with timestamp: `.env.backup.YYYYMMDD_HHMMSS`

### 2. **Generates Secure Secrets**
The script automatically generates cryptographically secure random values for:
- `JWT_SECRET` (64 characters)
- `JWT_REFRESH_SECRET` (64 characters)
- `ENCRYPTION_KEY` (64 characters)
- `COOKIE_SECRET` (64 characters)
- `REDIS_PASSWORD` (32 characters)
- `ADMIN_WALLET_ID` (UUID)
- `ADMIN_PASSWORD_HASH` (bcrypt hash of default password)

### 3. **Creates Environment-Specific Configuration**

#### Development Mode
- Database: Local PostgreSQL (localhost:5432)
- Redis: Local Redis (localhost:6379)
- Ollama: Local (localhost:11434)
- Stable Diffusion: Local (localhost:7860)
- Stripe: Test mode keys (placeholders)
- CORS: Allows localhost origins
- Logging: Debug level
- Age verification: Disabled

#### Production Mode
- Database: Requires configuration
- Redis: Requires configuration
- External service endpoints
- Stripe: Live keys (requires configuration)
- CORS: Domain-specific (requires configuration)
- Logging: Info level
- Age verification: Enabled

### 4. **Creates .env.example**
- Sanitized version of `.env` with no values
- Safe to commit to version control
- Helps team members know what variables are needed

---

## Generated Configuration

### Development `.env` Structure

```env
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database (PostgreSQL) - Ready for local development
DATABASE_URL=postgresql://aiart:aiart123@localhost:5432/ai_art_exchange

# Redis - Auto-generated password
REDIS_URL=redis://:RANDOM_PASSWORD@localhost:6379
REDIS_PASSWORD=RANDOM_PASSWORD

# Security - All auto-generated secure random values
JWT_SECRET=RANDOM_64_CHARS
JWT_REFRESH_SECRET=RANDOM_64_CHARS
ENCRYPTION_KEY=RANDOM_64_CHARS
COOKIE_SECRET=RANDOM_64_CHARS

# AI Services - Localhost endpoints
AI_API_URL=http://localhost:11434
SD_API_URL=http://localhost:7860

# Admin - Auto-generated UUID and password hash
ADMIN_WALLET_ID=GENERATED_UUID
ADMIN_PASSWORD_HASH=BCRYPT_HASH

# All other configuration with sensible defaults...
```

### Production `.env` Structure

```env
# All security secrets auto-generated
# All service endpoints require manual configuration
# Production-ready defaults
# Enhanced security settings
```

---

## Post-Setup Checklist

### Development Environment

After running the setup script:

1. **Install and Start Services**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Start Ollama
   ollama serve
   
   # Pull AI model (in another terminal)
   ollama pull llava
   
   # Install Stable Diffusion WebUI
   git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
   cd stable-diffusion-webui
   ./webui.sh --api --listen
   ```

2. **Start Database Services**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d postgres redis
   
   # Or install locally:
   # - PostgreSQL 16
   # - Redis 7
   ```

3. **Configure Stripe** (Optional for initial development)
   - Sign up at https://stripe.com
   - Get test API keys from https://dashboard.stripe.com/test/apikeys
   - Update `.env` with your keys

4. **Run Database Migrations**
   ```bash
   cd backend
   npm install
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Start the Application**
   ```bash
   # Backend
   cd backend
   npm run start:dev
   
   # Frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

### Production Environment

After running the setup script:

1. **Review Generated Secrets**
   - All secrets are cryptographically secure
   - Store them in a secure secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never commit the `.env` file

2. **Update Service Endpoints**
   - Database URL (RDS, managed PostgreSQL, etc.)
   - Redis URL (ElastiCache, managed Redis, etc.)
   - Ollama endpoint (if running on separate server)
   - Stable Diffusion endpoint (GPU server)

3. **Configure External Services**
   - Stripe: Replace with live keys
   - AWS S3: Add production credentials
   - Sentry: Add DSN for error tracking

4. **Security Hardening**
   ```bash
   # Change admin password
   # Update ADMIN_PASSWORD_HASH in .env
   
   # Set proper CORS origins
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   
   # Enable HTTPS
   # Configure SSL certificates in nginx/
   ```

5. **Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

---

## Environment Variables Reference

### Required for All Environments

| Variable | Description | Auto-Generated |
|----------|-------------|----------------|
| `NODE_ENV` | Environment mode | ✓ |
| `JWT_SECRET` | JWT signing secret | ✓ |
| `JWT_REFRESH_SECRET` | Refresh token secret | ✓ |
| `ENCRYPTION_KEY` | AES-256 encryption key | ✓ |
| `COOKIE_SECRET` | Cookie signing secret | ✓ |
| `DATABASE_URL` | PostgreSQL connection | ✓ (dev only) |
| `REDIS_URL` | Redis connection | ✓ (dev only) |
| `ADMIN_WALLET_ID` | Admin wallet UUID | ✓ |

### Optional but Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_API_URL` | Ollama endpoint | `http://localhost:11434` |
| `SD_API_URL` | Stable Diffusion endpoint | `http://localhost:7860` |
| `STRIPE_SECRET_KEY` | Stripe API key | Placeholder |
| `AWS_ACCESS_KEY_ID` | AWS credentials | Placeholder |
| `SENTRY_DSN` | Error tracking | Empty |

---

## Troubleshooting

### Script Fails to Generate Secrets

**Error:** "openssl command not found"
```bash
# Install OpenSSL
# macOS
brew install openssl

# Ubuntu/Debian
sudo apt-get install openssl

# Windows
# Use the Node.js script instead: node setup-env.js
```

### Bcrypt Hash Not Generated

**Warning:** "bcrypt not installed, using placeholder hash"
```bash
# Install bcrypt in backend
cd backend
npm install bcrypt

# Re-run setup
cd ..
node setup-env.js
```

### Permission Denied

**Error:** "Permission denied: ./setup-env.sh"
```bash
# Make script executable
chmod +x setup-env.sh

# Or use Node.js version
node setup-env.js
```

### .env Already Exists

The script will:
1. Prompt for confirmation
2. Create a timestamped backup
3. Generate new .env

**To skip prompt:**
```bash
# Manually remove .env first
rm .env
node setup-env.js
```

---

## Manual Configuration

If you prefer to configure manually:

1. Copy the template:
   ```bash
   cp .env.template .env
   ```

2. Generate secrets manually:
   ```bash
   # Generate random secret
   openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
   
   # Generate UUID
   uuidgen
   ```

3. Update all placeholder values

---

## Security Best Practices

### DO ✓

- ✓ Use the automated script for secure secret generation
- ✓ Keep `.env` file out of version control (already in `.gitignore`)
- ✓ Use different secrets for dev/staging/production
- ✓ Rotate secrets regularly
- ✓ Use a secrets manager in production
- ✓ Backup `.env` in secure location
- ✓ Review generated values before use

### DON'T ✗

- ✗ Commit `.env` to git
- ✗ Share `.env` via email/chat
- ✗ Use the same secrets across environments
- ✗ Use default/placeholder passwords in production
- ✗ Store secrets in plain text anywhere else
- ✗ Hardcode secrets in application code

---

## Advanced Usage

### Custom Default Values

Edit the script to change defaults:

```javascript
// setup-env.js
const customDefaults = {
  PORT: 8080,
  LOG_LEVEL: 'warn',
  ADMIN_CLAIM_RATIO_ENABLED: 10,
};
```

### Automated CI/CD Setup

```yaml
# .github/workflows/deploy.yml
- name: Generate environment
  run: |
    node setup-env.js <<EOF
    2
    EOF
    # Configure production values
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
```

### Docker Build

```dockerfile
# Dockerfile
RUN node setup-env.js <<EOF
1
EOF
```

---

## Support

For issues or questions:
1. Check this guide
2. Review generated `.env` file
3. Check `docs/OLLAMA_INTEGRATION.md` for AI setup
4. See main `README.md` for platform documentation

---

## Related Documentation

- [Main README](../README.md) - Platform overview
- [Ollama Integration](OLLAMA_INTEGRATION.md) - AI setup guide
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
- [.env.template](../.env.template) - All available variables
