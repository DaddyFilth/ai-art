#!/usr/bin/env node

/**
 * AI Art Exchange - Automated Environment Setup
 * Cross-platform Node.js version
 */

const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

// Generate random secret
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, length);
}

// Generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Generate bcrypt hash
function generatePasswordHash(password) {
  try {
    // Try to use bcrypt if available
    const bcrypt = require('bcrypt');
    return bcrypt.hashSync(password, 12);
  } catch (e) {
    log.warning('bcrypt not installed, using placeholder hash');
    return '$2b$12$PLACEHOLDER_HASH_INSTALL_BCRYPT_TO_GENERATE';
  }
}

// Prompt user for input
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

// Main setup function
async function setup() {
  console.log('\n🚀 AI Art Exchange - Environment Setup');
  console.log('========================================\n');

  // Check if .env exists
  if (fs.existsSync('.env')) {
    log.warning('.env file already exists!');
    const answer = await question('Do you want to overwrite it? (y/N): ');
    if (!answer.toLowerCase().startsWith('y')) {
      log.info('Setup cancelled.');
      process.exit(0);
    }

    // Backup existing .env
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupName = `.env.backup.${timestamp}`;
    fs.copyFileSync('.env', backupName);
    log.success(`Backed up existing .env to ${backupName}`);
  }

  console.log('\nSelect environment type:');
  console.log('1) Development (localhost, mock services)');
  console.log('2) Production (requires manual configuration)');
  
  const envChoice = await question('Enter choice (1-2): ');
  const isDevelopment = envChoice.trim() !== '2';
  const envType = isDevelopment ? 'development' : 'production';

  log.info(`Setting up for ${envType.toUpperCase()}`);
  console.log('\nGenerating secure secrets...');

  // Generate secrets
  const secrets = {
    JWT_SECRET: generateSecret(64),
    JWT_REFRESH_SECRET: generateSecret(64),
    ENCRYPTION_KEY: generateSecret(64),
    COOKIE_SECRET: generateSecret(64),
    REDIS_PASSWORD: generateSecret(32),
    ADMIN_WALLET_ID: generateUUID(),
    // Security: Generate a random secure password instead of hardcoded default
    ADMIN_PASSWORD_HASH: generatePasswordHash(generateSecret(16)),
  };

  log.success('Secrets generated');

  // Build .env content
  const timestamp = new Date().toISOString();
  let envContent = `# ============================================
# AI Art Revenue Exchange - Environment Configuration
# Auto-generated on: ${timestamp}
# ============================================

`;

  if (isDevelopment) {
    envContent += `# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database (PostgreSQL)
DATABASE_URL=postgresql://aiart:aiart123@localhost:5432/ai_art_exchange?schema=public

# Redis
REDIS_URL=redis://:${secrets.REDIS_PASSWORD}@localhost:6379
REDIS_PASSWORD=${secrets.REDIS_PASSWORD}

# Security Secrets (Auto-generated)
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
COOKIE_SECRET=${secrets.COOKIE_SECRET}

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# AWS/S3 (Optional for development)
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
ADMIN_WALLET_ID=${secrets.ADMIN_WALLET_ID}
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD_HASH=${secrets.ADMIN_PASSWORD_HASH}

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
`;
  } else {
    // Production configuration
    envContent += `# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (PostgreSQL) - CONFIGURE THIS
DATABASE_URL=postgresql://user:password@db-host:5432/ai_art_exchange?schema=public

# Redis - CONFIGURE THIS
REDIS_URL=redis://:${secrets.REDIS_PASSWORD}@redis-host:6379
REDIS_PASSWORD=${secrets.REDIS_PASSWORD}

# Security Secrets (Auto-generated - KEEP SECURE)
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
COOKIE_SECRET=${secrets.COOKIE_SECRET}

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
ADMIN_WALLET_ID=${secrets.ADMIN_WALLET_ID}
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD_HASH=${secrets.ADMIN_PASSWORD_HASH}

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
`;
  }

  // Write .env file
  fs.writeFileSync('.env', envContent);
  log.success('.env file created successfully!');

  // Create .env.example
  if (!fs.existsSync('.env.example')) {
    const exampleContent = envContent
      .split('\n')
      .map(line => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key] = line.split('=');
          return `${key}=`;
        }
        return line;
      })
      .join('\n');
    fs.writeFileSync('.env.example', exampleContent);
    log.success('.env.example created');
  }

  // Display important information
  console.log('\n================================================');
  console.log('📋 IMPORTANT INFORMATION');
  console.log('================================================\n');
  console.log('Generated Configuration:');
  console.log(`  • Environment: ${envType}`);
  console.log(`  • Admin Wallet ID: ${secrets.ADMIN_WALLET_ID}`);
  console.log(`${colors.yellow}  • Admin password has been randomly generated and hashed${colors.reset}`);
  console.log(`${colors.yellow}  • Create your first admin account via the API or database${colors.reset}\n`);

  if (isDevelopment) {
    console.log(`${colors.yellow}Development Setup Checklist:${colors.reset}`);
    console.log('  ☐ Install and start Ollama: ollama serve');
    console.log('  ☐ Pull LLaVA model: ollama pull llava');
    console.log('  ☐ Install and start Stable Diffusion WebUI');
    console.log('  ☐ Start PostgreSQL database');
    console.log('  ☐ Start Redis server');
    console.log('  ☐ Get Stripe test keys from https://stripe.com/docs/keys');
    console.log('  ☐ Run database migrations: npm run prisma:migrate');
    console.log('  ☐ Seed database: npm run prisma:seed\n');
    console.log(`${colors.green}Quick Start:${colors.reset}`);
    console.log('  docker-compose up -d        # Start services');
    console.log('  npm run prisma:migrate      # Run migrations');
    console.log('  npm run dev                 # Start development server');
  } else {
    console.log(`${colors.yellow}Production Setup Checklist:${colors.reset}`);
    console.log('  ☐ Configure DATABASE_URL with production database');
    console.log('  ☐ Configure REDIS_URL with production Redis');
    console.log('  ☐ Add production Stripe keys');
    console.log('  ☐ Configure AWS S3 credentials');
    console.log('  ☐ Update ALLOWED_ORIGINS with your domain(s)');
    console.log('  ☐ Configure Sentry DSN for error tracking');
    console.log('  ☐ Change admin password hash');
    console.log('  ☐ Set up SSL certificates');
    console.log('  ☐ Configure Ollama and SD WebUI endpoints\n');
    console.log(`${colors.red}⚠️  SECURITY WARNINGS:${colors.reset}`);
    console.log('  • Change the default admin password immediately!');
    console.log('  • Keep your .env file secure and never commit it');
    console.log('  • Review and update all API keys and secrets');
    console.log('  • Set up proper firewall rules');
    console.log('  • Enable HTTPS in production');
  }

  console.log('\n================================================\n');
  console.log(`${colors.green}Setup complete! 🎉${colors.reset}\n`);
  console.log('Next steps:');
  console.log('  1. Review and update .env with your specific values');
  console.log('  2. Follow the setup checklist above');
  console.log('  3. Read docs/OLLAMA_INTEGRATION.md for AI setup\n');
}

// Run setup
setup().catch((error) => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});
