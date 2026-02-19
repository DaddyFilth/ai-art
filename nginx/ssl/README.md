# SSL Certificate Configuration

This directory should contain your SSL/TLS certificates for HTTPS configuration.

## Required Files

- `cert.pem` - Your SSL certificate (public certificate)
- `key.pem` - Your private key

## Production Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to this directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

### Option 2: Self-Signed (Development Only)

```bash
# Generate self-signed certificate (for testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

**⚠️ WARNING**: Self-signed certificates should NEVER be used in production!

### Option 3: Commercial Certificate

If you purchased a certificate from a Certificate Authority (CA):

1. Place your certificate chain in `nginx/ssl/cert.pem`
2. Place your private key in `nginx/ssl/key.pem`
3. Ensure proper permissions:
   ```bash
   chmod 644 nginx/ssl/cert.pem
   chmod 600 nginx/ssl/key.pem
   ```

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Add to crontab
0 0 1 * * certbot renew --deploy-hook "docker-compose restart nginx"
```

## Security Best Practices

1. **Keep private keys secure**: Never commit `key.pem` to version control
2. **Use strong key sizes**: Minimum 2048-bit RSA or 256-bit ECDSA
3. **Enable OCSP stapling**: Already configured in nginx.conf
4. **Monitor expiration**: Set up alerts for certificate expiration
5. **Use TLS 1.3 only**: Already enforced in nginx.conf

## Troubleshooting

### Certificate Verification

```bash
# Check certificate details
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Verify private key matches certificate
openssl x509 -noout -modulus -in nginx/ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in nginx/ssl/key.pem | openssl md5
# These should match
```

### Common Issues

1. **"No such file or directory"**: Ensure cert.pem and key.pem exist in this directory
2. **"Permission denied"**: Check file permissions (644 for cert, 600 for key)
3. **"Certificate verification failed"**: Ensure certificate chain is complete
4. **"Private key mismatch"**: Verify the private key matches the certificate

## .gitignore

The following entries should be in `.gitignore` to prevent committing sensitive files:

```
nginx/ssl/*.pem
nginx/ssl/*.key
nginx/ssl/*.crt
nginx/ssl/*.csr
```
