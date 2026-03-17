# AI Art Revenue Exchange

## Enterprise-Grade SaaS Platform for AI Art Generation and Monetization

[![Security](https://img.shields.io/badge/Security-Zero%20Trust-blue)](SECURITY.md)
[![License](https://img.shields.io/badge/License-Proprietary-red)](https://)
[![Docker](https://img.shields.io/badge/Docker-Ready-green)](https://)

---

## 🌐 Platform Overview

AI Art Revenue Exchange is a production-ready, enterprise-grade SaaS platform that enables users to:

- **Generate AI Digital Art** - Create stunning artwork using state-of-the-art AI models (Ollama + Stable Diffusion, fully local)
- **Sell Assets** - List artwork via auction or buy-it-now mechanisms
- **Earn Tokens** - Participate in the in-game token economy
- **Monetize Data** - Opt into data sharing for platform benefits
- **Secure Transactions** - Enterprise-grade financial security

### 🚀 Key Features
- ✅ **No External API Keys Required** - All AI generation runs locally using Ollama and Stable Diffusion
- ✅ **No Google AI Dependencies** - Complete control over your AI infrastructure
- ✅ **Privacy First** - Your data stays on your servers
- ✅ **Zero API Costs** - No per-generation charges or usage limits

---

## 💰 Core Monetization Model

### User-Owned Asset Sales
| Recipient | Percentage |
|-----------|------------|
| Creator Wallet | 90% |
| Admin Upkeep Fund | 10% |

### Admin-Owned Asset Sales
| Recipient | Percentage |
|-----------|------------|
| Admin Upkeep Fund | 90% |
| Original Creator (Royalty) | 10% |

### Ad Revenue
- **100%** → Admin Upkeep Fund
- Users receive zero ad revenue share
- Tracked separately in `AdRevenueLogs` table

---

## 🎨 Admin Asset Claim Rule

| Data Sharing Status | Claim Ratio |
|---------------------|-------------|
| ENABLED (default) | Every 5th asset → Admin |
| DISABLED | Every 2nd asset → Admin |

- Ownership transfer happens instantly at creation
- Creator ID is retained permanently
- Irreversible once claimed

---

## 🪙 In-Game Token System

### Token Earning Methods
- Daily login rewards
- Creative challenges
- Referrals
- Engagement milestones
- Watching ads

### Token Usage
- AI generation credits
- Premium tools
- Listing boosts

**Important**: Tokens cannot be converted to fiat currency.

---

## 🔐 Security Architecture

### Zero-Trust Security Model
- Defense-in-depth against OWASP Top 10
- SQL/NoSQL injection protection
- XSS and CSRF protection
- SSRF and IDOR prevention
- RCE and privilege escalation protection
- Replay attack prevention
- Wallet double-spend protection
- Race condition handling
- Stripe webhook spoofing protection

### Encryption Standards
| Data State | Standard |
|------------|----------|
| Data at Rest | AES-256 |
| Data in Transit | TLS 1.3 |
| Password Hashing | bcrypt (12 rounds) |
| Ledger Integrity | SHA-256 |

### PII Protection
- Field-level encryption (AES-256)
- Tokenization for payment references
- DTO mapping layer
- Separate PII service module

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: React Query

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis
- **Payments**: Stripe

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx (hardened)
- **Storage**: S3-compatible

---

## 📁 Project Structure

```
ai-art-exchange/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── ai/             # AI generation service
│   │   ├── assets/         # Asset management
│   │   ├── marketplace/    # Auctions and marketplace
│   │   ├── tokens/         # Token economy
│   │   ├── payments/       # Stripe integration
│   │   ├── ledger/         # Double-entry accounting
│   │   ├── jobs/           # Cron jobs
│   │   └── common/         # Shared utilities
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── Dockerfile
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
│   └── Dockerfile
├── nginx/                  # Nginx configuration
│   └── nginx.conf
├── legal/                  # Legal documents
│   ├── TERMS_OF_SERVICE.md
│   └── PRIVACY_POLICY.md
├── docs/                   # Documentation
│   └── DEPLOYMENT_GUIDE.md
├── docker-compose.yml
├── .env.template
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Stripe account
- AWS account (for S3)
- **Ollama** (for AI prompt enhancement)
- **Stable Diffusion WebUI** (for image generation)

### AI Generation Setup

This platform uses **Ollama** for prompt enhancement and **Stable Diffusion WebUI** for local image generation. **No external API keys required!**

#### Install Ollama (No API Key Needed)
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Pull a vision model (in another terminal)
ollama pull llava
```

#### Install Stable Diffusion WebUI (No API Key Needed)
```bash
# Clone SD WebUI
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run with API enabled
./webui.sh --api --listen

# SD WebUI will be available at http://localhost:7860
```

#### Configure AI Services (No API Keys Required)
Update your `.env` file:
```env
# Ollama endpoint (default: http://localhost:11434)
AI_API_URL=http://localhost:11434
AI_API_KEY=not-required-for-ollama
OLLAMA_MODEL=llava

# Stable Diffusion WebUI endpoint (default: http://localhost:7860)
SD_API_URL=http://localhost:7860
```

### 1. Clone Repository
```bash
git clone <repository-url>
cd ai-art
```

### 2. Configure Environment (Automated)

**Option A: Automated Setup (Recommended)**
```bash
# Run automated setup script
node setup-env.js

# Select environment type:
# 1) Development - Auto-configures for localhost
# 2) Production - Generates secure secrets, requires manual service configuration
```

The script will:
- Generate cryptographically secure random secrets
- Create `.env` file with sensible defaults
- Configure for development or production
- Create `.env.example` for reference

**Option B: Manual Setup**
```bash
cp .env.template .env
# Edit .env with your configuration
```

📖 **See [Setup Guide](docs/SETUP_GUIDE.md) for detailed instructions**

### 3. Start Services
```bash
docker-compose up -d --build
```

### 4. Run Migrations
```bash
docker-compose exec backend npx prisma migrate deploy
```

### 5. Access Platform
- Frontend: http://localhost
- API: http://localhost/api/v1
- API Docs: http://localhost/api/v1/docs

---

## 📊 Database Schema

### Core Tables
- **Users** - User accounts and profiles
- **Assets** - Generated artwork
- **Auctions** - Marketplace listings
- **Bids** - Auction bids
- **Wallets** - User wallets
- **Transactions** - Financial transactions
- **LedgerEntries** - Double-entry ledger
- **InGameTransactions** - Token transactions
- **AdRevenueLogs** - Ad revenue tracking
- **DataUsageLogs** - Data monetization tracking

### Security Tables
- **ContentReports** - User reports
- **ModerationLogs** - Moderation actions
- **AgeVerificationRecords** - Age verification data
- **ConsentHistory** - Consent tracking

---

## 🔧 Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret (32+ chars) |
| `ENCRYPTION_KEY` | AES-256 key (32+ chars) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `ADMIN_WALLET_ID` | Admin wallet UUID |

See `.env.template` for complete list.

---

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### AI Generation Endpoints
- `POST /api/v1/ai/generate` - Generate artwork
- `GET /api/v1/ai/history` - Generation history
- `GET /api/v1/ai/stats` - Generation statistics

### Marketplace Endpoints
- `GET /api/v1/marketplace/auctions` - List auctions
- `POST /api/v1/marketplace/auctions` - Create auction
- `POST /api/v1/marketplace/bids` - Place bid

### Token Endpoints
- `GET /api/v1/tokens/balance` - Get token balance
- `POST /api/v1/tokens/daily-login` - Claim daily reward
- `GET /api/v1/tokens/history` - Token transaction history

---

## 🛡️ Security Features

### Implemented Protections
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Secure authentication
- ✅ Encrypted data at rest
- ✅ TLS 1.3 in transit
- ✅ Double-entry accounting
- ✅ Immutable ledger
- ✅ SHA-256 transaction hashing

---

## 📈 Monitoring & Logging

### Health Checks
- Backend: `GET /health`
- Database: Automatic via Docker
- Redis: Automatic via Docker

### Automated Jobs
- Auction auto-close (every minute)
- Ledger integrity verification (hourly)
- Revenue report generation (daily)
- Security anomaly detection (every 5 minutes)
- Token expiration (daily)

---

## 📜 Legal Documents

- [Terms of Service](legal/TERMS_OF_SERVICE.md)
- [Privacy Policy](legal/PRIVACY_POLICY.md)
- [Revenue Sharing Disclosure](legal/TERMS_OF_SERVICE.md#4-ai-art-generation)
- [Data Monetization Disclosure](legal/PRIVACY_POLICY.md#4-data-sharing-and-disclosure)

---

## 📱 Google Play Store

For Google Play Store submission documentation:
- [Google Play Submission Guide](google-play/README.md)
- Complete documentation for app store listing, data safety, content rating, and build instructions

---

## 🤝 Contributing

This is a proprietary platform. For enterprise licensing or partnership inquiries, contact:

**Email**: enterprise@aiartexchange.com

---

## 📄 License

Proprietary - All Rights Reserved

---

## 🆘 Support

For technical support:
- **Email**: support@aiartexchange.com
- **Documentation**: https://docs.aiartexchange.com

For security issues:
- **Email**: security@aiartexchange.com

---

<p align="center">
  <strong>AI Art Revenue Exchange</strong><br>
  Enterprise-Grade • Secure • Scalable
</p>
