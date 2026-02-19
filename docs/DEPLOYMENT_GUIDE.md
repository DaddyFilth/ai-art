# AI Art Revenue Exchange - Deployment Guide

## Overview

This guide covers the deployment of the AI Art Revenue Exchange platform, an enterprise-grade SaaS application with zero-trust security architecture.

## Prerequisites

- Docker and Docker Compose
- Domain name with SSL certificate
- Stripe account
- AWS account (for S3 storage)
- AI generation service API key

## System Requirements

- **CPU**: 4+ cores recommended
- **RAM**: 8GB+ recommended
- **Storage**: 50GB+ SSD
- **OS**: Linux (Ubuntu 22.04 LTS recommended)

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd ai-art-exchange

# Copy environment template
cp .env.template .env

# Edit .env with your configuration
nano .env
```

### 2. Generate Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32

# Generate cookie secret
openssl rand -base64 32
```

### 3. SSL Certificates

Place your SSL certificates in `nginx/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

Or use Let's Encrypt:
```bash
certbot certonly --standalone -d yourdomain.com
```

### 4. Database Initialization

```bash
# Create init script
mkdir -p scripts
cat > scripts/init-db.sql << 'EOF'
-- Create admin wallet
INSERT INTO wallets (id, type, fiat_balance, token_balance, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'ADMIN_UPKEEP', 0, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
EOF
```

### 5. Deploy

```bash
# Build and start services
docker-compose up -d --build

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed database (optional)
docker-compose exec backend npx prisma db seed
```

### 6. Verify Deployment

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test health endpoint
curl https://yourdomain.com/health
```

## Production Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes |
| `ENCRYPTION_KEY` | AES-256 key (32+ chars) | Yes |
| `STRIPE_SECRET_KEY` | Stripe API key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `AWS_ACCESS_KEY_ID` | AWS credentials | Yes |
| `ADMIN_WALLET_ID` | Admin wallet UUID | Yes |

### Security Hardening

1. **Firewall Configuration**
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH (consider restricting to specific IPs)
ufw allow 80/tcp    # HTTP (redirects to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable

# Optional: Block outbound traffic from specific containers
# Use Docker network policies or iptables for fine-grained control
```

**Important**: The docker-compose network allows containers to make outbound connections for:
- Stripe API calls (payment processing)
- AWS S3 (file storage)
- External AI services (Ollama, Stable Diffusion)
- DNS resolution and package updates

To restrict container egress:
```bash
# Example: Allow only specific external IPs/domains
# This requires additional iptables rules or Docker network policies
iptables -A DOCKER-USER -s 172.18.0.0/16 -d 54.230.0.0/16 -j ACCEPT  # AWS S3
iptables -A DOCKER-USER -s 172.18.0.0/16 -d 0.0.0.0/0 -j DROP        # Block all other egress
```

2. **Fail2Ban Configuration**
```bash
apt install fail2ban
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
```

3. **Docker Security**
- Use non-root containers (configured in Dockerfiles)
- Enable Docker Content Trust
- Regularly update base images
- Containers have read-only root filesystems
- Security options: `no-new-privileges:true` enabled
- Health checks for all services

**Network Isolation**: The application uses a dedicated Docker bridge network (`aiart-network`). Only the Nginx container exposes ports to the host. Backend, database, and Redis are isolated and not directly accessible from the internet.

For additional security:
- Consider using Docker secrets for sensitive environment variables
- Enable Docker's built-in AppArmor/SELinux profiles
- Implement egress filtering with iptables or network policies
- Use Docker Content Trust to verify image integrity

### Nginx Configuration

The included `nginx/nginx.conf` provides:
- SSL/TLS termination
- Rate limiting
- Request filtering
- Security headers

### Backup Strategy

1. **Database Backups**
```bash
# Daily backup cron job
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres ai_art_exchange > /backups/db-$(date +\%Y\%m\%d).sql
```

2. **File Backups**
```bash
# S3 sync for uploaded files
aws s3 sync /var/lib/docker/volumes/ai-art-exchange_s3_data s3://backup-bucket/ai-art-exchange/
```

## Monitoring

### Health Checks

- Backend: `GET /health`
- Database: Automatic via Docker healthcheck
- Redis: Automatic via Docker healthcheck

### Logging

Logs are written to:
- Docker stdout/stderr
- Optional: External logging service (ELK, Splunk)

### Metrics

Key metrics to monitor:
- Request latency
- Error rates
- Database connection pool
- Token balance anomalies
- Failed login attempts

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check PostgreSQL logs

2. **Stripe Webhook Errors**
   - Verify webhook secret
   - Check endpoint URL
   - Review Stripe dashboard logs

3. **AI Generation Failed**
   - Verify AI_API_KEY
   - Check AI service status
   - Review rate limits

### Support

For deployment support:
- Email: devops@aiartexchange.com
- Documentation: https://docs.aiartexchange.com

## Updates

### Rolling Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend npx prisma migrate deploy
```

### Database Migrations

```bash
# Generate migration
docker-compose exec backend npx prisma migrate dev --name <migration-name>

# Apply migration
docker-compose exec backend npx prisma migrate deploy
```

## Compliance

### GDPR
- Data deletion endpoint: `DELETE /api/v1/users/me`
- Data export available on request
- Consent tracking implemented

### PCI DSS
- Payment data handled by Stripe
- No card data stored locally
- TLS 1.3 enforced

## Disaster Recovery

### Recovery Procedures

1. **Database Restore**
```bash
docker-compose exec -T postgres psql -U postgres ai_art_exchange < backup.sql
```

2. **Service Recovery**
```bash
docker-compose down
docker-compose up -d
```

### RTO/RPO
- **RTO**: 1 hour
- **RPO**: 24 hours (daily backups)

---

For additional support, contact the DevOps team.
