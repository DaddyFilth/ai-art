#!/bin/bash

# ============================================
# AI Art Exchange - Automated Environment Setup
# ============================================
# This script generates a .env file with secure random values
# and sensible defaults for development and production

set -e

echo "🚀 AI Art Exchange - Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate random string
generate_secret() {
    local length=$1
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to generate UUID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        cat /proc/sys/kernel/random/uuid 2>/dev/null || \
        python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || \
        node -e 'console.log(require("crypto").randomUUID())' 2>/dev/null || \
        echo "00000000-0000-0000-0000-000000000000"
    fi
}

# Check if .env already exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backed up existing .env${NC}"
fi

# Check for required commands
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl is required but not installed.${NC}"
    exit 1
fi

echo ""
echo "Select environment type:"
echo "1) Development (localhost, mock services)"
echo "2) Production (requires manual configuration)"
read -p "Enter choice (1-2): " env_choice

case $env_choice in
    1)
        ENV_TYPE="development"
        echo -e "${GREEN}Setting up for DEVELOPMENT${NC}"
        ;;
    2)
        ENV_TYPE="production"
        echo -e "${YELLOW}Setting up for PRODUCTION${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice. Defaulting to development.${NC}"
        ENV_TYPE="development"
        ;;
esac

echo ""
echo "Generating secure secrets..."

# Generate secrets
JWT_SECRET=$(generate_secret 64)
JWT_REFRESH_SECRET=$(generate_secret 64)
ENCRYPTION_KEY=$(generate_secret 64)
COOKIE_SECRET=$(generate_secret 64)
REDIS_PASSWORD=$(generate_secret 32)
ADMIN_WALLET_ID=$(generate_uuid)

# Generate bcrypt hash for admin password (using random secure password)
ADMIN_RANDOM_PASS=$(generate_secret 16)
if command -v node &> /dev/null; then
    ADMIN_PASSWORD_HASH=$(node -e "console.log(require('bcrypt').hashSync(process.argv[1], 12))" "$ADMIN_RANDOM_PASS" 2>/dev/null || echo '$2b$12$PLACEHOLDER_HASH')
else
    ADMIN_PASSWORD_HASH='$2b$12$PLACEHOLDER_HASH'
fi

echo -e "${GREEN}✓ Secrets generated${NC}"

# Start writing .env file
cat > .env << 'EOF'
# ============================================
# AI Art Revenue Exchange - Environment Configuration
# Auto-generated on: $(date)
# ============================================

EOF

# Add configuration based on environment type
if [ "$ENV_TYPE" = "development" ]; then
    cat >> .env << EOF
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database (PostgreSQL)
DATABASE_URL=postgresql://aiart:aiart123@localhost:5432/ai_art_exchange?schema=public

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security Secrets (Auto-generated)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ENCRYPTION_KEY=${ENCRYPTION_KEY}
COOKIE_SECRET=${COOKIE_SECRET}

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# AWS/S3 (Optional for development - uses local storage if not configured)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=ai-art-dev-bucket
AWS_REGION=us-east-1

# Stripe (Development keys)
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# AI Service (Ollama + Stable Diffusion)
AI_API_URL=http://localhost:11434
AI_API_KEY=not-required-for-ollama
OLLAMA_MODEL=llava

# Stable Diffusion WebUI
SD_API_URL=http://localhost:7860
SD_DEFAULT_STEPS=30
SD_DEFAULT_CFG_SCALE=7
SD_DEFAULT_SAMPLER=DPM++ 2M Karras

# Admin Configuration
ADMIN_WALLET_ID=${ADMIN_WALLET_ID}
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}

# Platform Settings
PLATFORM_FEE_PERCENT=10
ADMIN_CLAIM_RATIO_ENABLED=5
ADMIN_CLAIM_RATIO_DISABLED=2

# Mature Content
MATURE_CONTENT_ENABLED=true
AGE_VERIFICATION_REQUIRED=false

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs

# Monitoring (Optional)
SENTRY_DSN=

# Feature Flags
ENABLE_DATA_MONETIZATION=true
ENABLE_ADS=true
ENABLE_REFERRALS=true
ENABLE_CHALLENGES=true
EOF

else
    # Production configuration
    cat >> .env << EOF
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (PostgreSQL) - CONFIGURE THIS
DATABASE_URL=postgresql://user:password@db-host:5432/ai_art_exchange?schema=public

# Redis - CONFIGURE THIS
REDIS_URL=redis://:${REDIS_PASSWORD}@redis-host:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security Secrets (Auto-generated - KEEP SECURE)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ENCRYPTION_KEY=${ENCRYPTION_KEY}
COOKIE_SECRET=${COOKIE_SECRET}

# CORS - CONFIGURE YOUR DOMAINS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# AWS/S3 - CONFIGURE THIS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-production-bucket
AWS_REGION=us-east-1

# Stripe - CONFIGURE WITH LIVE KEYS
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE

# AI Service (Ollama + Stable Diffusion) - CONFIGURE ENDPOINTS
AI_API_URL=http://ollama-server:11434
AI_API_KEY=not-required-for-ollama
OLLAMA_MODEL=llava

# Stable Diffusion WebUI
SD_API_URL=http://sd-server:7860
SD_DEFAULT_STEPS=30
SD_DEFAULT_CFG_SCALE=7
SD_DEFAULT_SAMPLER=DPM++ 2M Karras

# Admin Configuration
ADMIN_WALLET_ID=${ADMIN_WALLET_ID}
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}

# Platform Settings
PLATFORM_FEE_PERCENT=10
ADMIN_CLAIM_RATIO_ENABLED=5
ADMIN_CLAIM_RATIO_DISABLED=2

# Mature Content
MATURE_CONTENT_ENABLED=true
AGE_VERIFICATION_REQUIRED=true

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/ai-art-exchange

# Monitoring - CONFIGURE THIS
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Feature Flags
ENABLE_DATA_MONETIZATION=true
ENABLE_ADS=true
ENABLE_REFERRALS=true
ENABLE_CHALLENGES=true
EOF

fi

echo ""
echo -e "${GREEN}✓ .env file created successfully!${NC}"
echo ""

# Display important information
echo "================================================"
echo "📋 IMPORTANT INFORMATION"
echo "================================================"
echo ""
echo "Generated Configuration:"
echo "  • Environment: ${ENV_TYPE}"
echo "  • Admin Wallet ID: ${ADMIN_WALLET_ID}"
echo ""
echo -e "${YELLOW}⚠️  ADMIN ACCOUNT SETUP:${NC}"
echo "  The admin password hash has been randomly generated for security."
echo "  To create your first admin account, use one of these methods:"
echo "  1. Via database seed script: npm run prisma:seed"
echo "  2. Via API registration endpoint with admin role"
echo "  3. Via database: INSERT INTO users with role=ADMIN"
echo ""

if [ "$ENV_TYPE" = "development" ]; then
    echo -e "${YELLOW}Development Setup Checklist:${NC}"
    echo "  ☐ Install and start Ollama: ollama serve"
    echo "  ☐ Pull LLaVA model: ollama pull llava"
    echo "  ☐ Install and start Stable Diffusion WebUI"
    echo "  ☐ Start PostgreSQL database"
    echo "  ☐ Start Redis server"
    echo "  ☐ Get Stripe test keys from https://stripe.com/docs/keys"
    echo "  ☐ Run database migrations: npm run prisma:migrate"
    echo "  ☐ Seed database: npm run prisma:seed"
    echo ""
    echo -e "${GREEN}Quick Start:${NC}"
    echo "  docker-compose up -d        # Start services"
    echo "  npm run prisma:migrate      # Run migrations"
    echo "  npm run dev                 # Start development server"
else
    echo -e "${YELLOW}Production Setup Checklist:${NC}"
    echo "  ☐ Configure DATABASE_URL with production database"
    echo "  ☐ Configure REDIS_URL with production Redis"
    echo "  ☐ Add production Stripe keys"
    echo "  ☐ Configure AWS S3 credentials"
    echo "  ☐ Update ALLOWED_ORIGINS with your domain(s)"
    echo "  ☐ Configure Sentry DSN for error tracking"
    echo "  ☐ Change admin password hash"
    echo "  ☐ Set up SSL certificates"
    echo "  ☐ Configure Ollama and SD WebUI endpoints"
    echo ""
    echo -e "${RED}⚠️  SECURITY WARNINGS:${NC}"
    echo "  • Change the default admin password immediately!"
    echo "  • Keep your .env file secure and never commit it"
    echo "  • Review and update all API keys and secrets"
    echo "  • Set up proper firewall rules"
    echo "  • Enable HTTPS in production"
fi

echo ""
echo "================================================"
echo ""

# Create .env.example if it doesn't exist
if [ ! -f .env.example ]; then
    echo "Creating .env.example..."
    sed 's/=.*/=/' .env > .env.example
    echo -e "${GREEN}✓ .env.example created${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete! 🎉${NC}"
echo ""
echo "Next steps:"
echo "  1. Review and update .env with your specific values"
echo "  2. Follow the setup checklist above"
echo "  3. Read docs/OLLAMA_INTEGRATION.md for AI setup"
echo ""
