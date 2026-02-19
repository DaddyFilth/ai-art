/**
 * Environment Configuration Validation
 * Ensures all required environment variables are present and valid
 */

import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('0.0.0.0'),
  
  // Database
  DATABASE_URL: Joi.string().required().uri(),
  
  // Redis
  REDIS_URL: Joi.string().required().uri(),
  REDIS_PASSWORD: Joi.string().required().min(16),
  
  // Security
  JWT_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  
  // Encryption
  ENCRYPTION_KEY: Joi.string().required().min(32),
  COOKIE_SECRET: Joi.string().required().min(32),
  
  // CORS
  ALLOWED_ORIGINS: Joi.string().required(),
  
  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  
  // AWS/S3
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),
  AWS_REGION: Joi.string().default('us-east-1'),
  
  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required().pattern(/^sk_/),
  STRIPE_WEBHOOK_SECRET: Joi.string().required().pattern(/^whsec_/),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required().pattern(/^pk_/),
  
  // AI Service (Ollama - no API key required)
  AI_API_KEY: Joi.string().optional().allow('', 'not-required-for-ollama'),
  AI_API_URL: Joi.string().uri().required(),
  OLLAMA_MODEL: Joi.string().optional().default('llava'),
  SD_API_URL: Joi.string().uri().optional(),
  
  // Admin Configuration
  ADMIN_WALLET_ID: Joi.string().uuid().required(),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD_HASH: Joi.string().required(),
  
  // Platform Settings
  PLATFORM_FEE_PERCENT: Joi.number().min(0).max(100).default(10),
  ADMIN_CLAIM_RATIO_ENABLED: Joi.number().min(1).default(5),
  ADMIN_CLAIM_RATIO_DISABLED: Joi.number().min(1).default(2),
  
  // Mature Content
  MATURE_CONTENT_ENABLED: Joi.boolean().default(true),
  AGE_VERIFICATION_REQUIRED: Joi.boolean().default(true),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_FILE_PATH: Joi.string().default('/var/log/ai-art-exchange'),
  
  // Monitoring
  SENTRY_DSN: Joi.string().uri().optional(),
  
  // Feature Flags
  ENABLE_DATA_MONETIZATION: Joi.boolean().default(true),
  ENABLE_ADS: Joi.boolean().default(true),
  ENABLE_REFERRALS: Joi.boolean().default(true),
  ENABLE_CHALLENGES: Joi.boolean().default(true),
});
