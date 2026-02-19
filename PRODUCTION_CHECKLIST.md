# Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] All environment variables are set in `.env` file
- [ ] Secrets are generated using cryptographically secure methods (32+ characters)
- [ ] `NODE_ENV` is set to `production`
- [ ] Database URL is configured for production database
- [ ] Redis URL is configured for production Redis instance
- [ ] JWT secrets are unique and different from development
- [ ] Encryption keys are unique and different from development
- [ ] Cookie secret is unique and different from development
- [ ] Admin wallet ID is configured
- [ ] CORS `ALLOWED_ORIGINS` contains only production domains

### 2. SSL/TLS Certificates
- [ ] Valid SSL certificate obtained (Let's Encrypt or commercial CA)
- [ ] Certificate placed in `nginx/ssl/cert.pem`
- [ ] Private key placed in `nginx/ssl/key.pem`
- [ ] Private key permissions set to 600
- [ ] Certificate expiration date monitored (set up renewal alerts)
- [ ] **Never use self-signed certificates in production**

### 3. Database Configuration
- [ ] Production database created
- [ ] Database has strong password
- [ ] Database is not publicly accessible (firewall rules)
- [ ] Database backups configured and tested
- [ ] Database migrations reviewed
- [ ] Database connection pool size configured
- [ ] Admin wallet created in database

### 4. External Services
- [ ] Stripe account configured (production keys)
- [ ] Stripe webhook secret configured
- [ ] Stripe webhook endpoint registered: `https://yourdomain.com/api/v1/payments/webhook`
- [ ] AWS S3 bucket created
- [ ] AWS credentials configured
- [ ] S3 bucket permissions configured (private)
- [ ] Ollama installed and running (`ollama serve`)
- [ ] Ollama model downloaded (`ollama pull llava`)
- [ ] Stable Diffusion WebUI installed
- [ ] Stable Diffusion WebUI running with API enabled (`./webui.sh --api --listen`)

### 5. Security Configuration
- [ ] Firewall rules configured (allow only ports 22, 80, 443)
- [ ] SSH access restricted (key-based authentication only)
- [ ] fail2ban or similar intrusion prevention installed
- [ ] Docker containers run as non-root users
- [ ] Security headers verified in nginx configuration
- [ ] Rate limiting configured and tested
- [ ] CSRF protection enabled
- [ ] All secrets rotated from development values

### 6. Monitoring & Logging
- [ ] Health check endpoint accessible: `GET /health`
- [ ] Readiness endpoint accessible: `GET /health/ready`
- [ ] Liveness endpoint accessible: `GET /health/live`
- [ ] Log aggregation configured (optional: ELK, Splunk, CloudWatch)
- [ ] Error alerting configured
- [ ] Uptime monitoring configured
- [ ] Performance metrics collection enabled

### 7. Code Quality
- [ ] All tests passing (`npm test` in backend and frontend)
- [ ] No TODO/FIXME comments in critical paths
- [ ] Security audit clean (`npm audit` in backend and frontend)
- [ ] Code linting passes (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] Docker images build successfully

## Deployment Steps

### Step 1: Server Setup
```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone and Configure
```bash
# Clone repository
git clone <repository-url>
cd ai-art

# Run automated setup (recommended)
node setup-env.js
# Select "Production" when prompted

# OR manually configure
cp .env.template .env
nano .env  # Edit all required values
```

### Step 3: SSL Certificates
```bash
# Option 1: Let's Encrypt (Recommended)
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chmod 600 nginx/ssl/key.pem

# Option 2: Commercial Certificate
# Place your cert.pem and key.pem in nginx/ssl/
```

### Step 4: AI Services Setup
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &  # Run in background
ollama pull llava  # Download model

# Install Stable Diffusion WebUI
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh --api --listen &  # Run with API enabled

# Update .env with AI service URLs
# AI_API_URL=http://localhost:11434
# SD_API_URL=http://localhost:7860
```

### Step 5: Build and Deploy
```bash
# Build and start services
docker-compose up -d --build

# Wait for services to be healthy
docker-compose ps

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Verify deployment
curl https://yourdomain.com/health
```

### Step 6: Post-Deployment Verification
```bash
# Check service health
curl https://yourdomain.com/health
curl https://yourdomain.com/health/ready
curl https://yourdomain.com/health/live

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Test API endpoints
curl https://yourdomain.com/api/v1/docs  # Swagger documentation
```

## Post-Deployment Checklist

### Immediate Verification
- [ ] All services are running (`docker-compose ps`)
- [ ] Health endpoints return 200 OK
- [ ] Frontend loads successfully
- [ ] API documentation accessible
- [ ] Database migrations completed
- [ ] SSL certificate valid (check browser)

### Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] AI generation works
- [ ] Payment processing works (test with Stripe test cards)
- [ ] File uploads work
- [ ] Marketplace listings work

### Security Verification
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present (check with securityheaders.com)
- [ ] Rate limiting works
- [ ] CORS only allows configured origins
- [ ] SQL injection protection verified
- [ ] XSS protection verified

### Performance Testing
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Database query performance acceptable
- [ ] Memory usage within limits
- [ ] CPU usage within limits

## Maintenance

### Daily Tasks
- [ ] Monitor error logs
- [ ] Check service health
- [ ] Review failed transactions
- [ ] Monitor disk space

### Weekly Tasks
- [ ] Review security logs
- [ ] Check for security updates
- [ ] Review performance metrics
- [ ] Test backup restoration

### Monthly Tasks
- [ ] Rotate secrets (optional, but recommended quarterly)
- [ ] Review and update dependencies
- [ ] Security audit
- [ ] Performance optimization review

## Backup Strategy

### Database Backups
```bash
# Create backup script
cat > /usr/local/bin/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres ai_art_exchange > /backups/db_$DATE.sql
# Keep only last 30 days
find /backups -name "db_*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-db.sh" | crontab -
```

### File Backups
```bash
# Sync uploads to S3 (if using local storage)
aws s3 sync /var/lib/docker/volumes/ai-art_uploads s3://backup-bucket/uploads/
```

## Rollback Procedure

### If deployment fails:
```bash
# Stop services
docker-compose down

# Restore previous version
git checkout <previous-commit>

# Restart services
docker-compose up -d

# Restore database (if migrations ran)
docker-compose exec -T postgres psql -U postgres ai_art_exchange < backup.sql
```

## Troubleshooting

### Service Won't Start
1. Check logs: `docker-compose logs <service>`
2. Verify environment variables
3. Check disk space
4. Verify database connectivity

### SSL Certificate Issues
1. Verify certificate files exist in `nginx/ssl/`
2. Check file permissions (cert: 644, key: 600)
3. Verify certificate is not expired
4. Check nginx logs: `docker-compose logs nginx`

### Database Connection Issues
1. Verify DATABASE_URL in .env
2. Check PostgreSQL is running: `docker-compose ps postgres`
3. Test connection: `docker-compose exec backend npx prisma db pull`

### Performance Issues
1. Check resource usage: `docker stats`
2. Review slow query logs
3. Check Redis connection
4. Review rate limiting configuration

## Support Contacts

- **Technical Issues**: devops@aiartexchange.com
- **Security Issues**: security@aiartexchange.com
- **Documentation**: https://docs.aiartexchange.com

## Additional Resources

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Security Policy](SECURITY.md)
- [API Documentation](http://localhost/api/v1/docs)
- [Docker Documentation](https://docs.docker.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Last Updated**: February 2026
**Version**: 1.0.0
