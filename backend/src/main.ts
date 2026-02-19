/**
 * AI Art Revenue Exchange - Enterprise API Entry Point
 * Zero-Trust Security Architecture
 * Financial-Grade Transaction Processing
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  // ==================== SECURITY MIDDLEWARE ====================
  
  // Helmet security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }));

  // Compression
  app.use(compression({
    filter: () => true,
    level: 6,
  }));

  // Cookie parser with secret
  app.use(cookieParser(configService.get('COOKIE_SECRET')));

  // Custom security headers
  app.use(new SecurityHeadersMiddleware().use);

  // ==================== CORS CONFIGURATION ====================
  
  const allowedOrigins = configService.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:3000',
    'https://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Idempotency-Key',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  });

  // ==================== VALIDATION ====================
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  // ==================== GLOBAL FILTERS ====================
  
  app.useGlobalFilters(new AllExceptionsFilter());

  // ==================== API PREFIX ====================
  
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  });

  // ==================== GRACEFUL SHUTDOWN ====================
  
  app.enableShutdownHooks();

  // ==================== START SERVER ====================
  
  const port = configService.get('PORT') || 3000;
  const host = configService.get('HOST') || '0.0.0.0';

  await app.listen(port, host);

  logger.log(`🚀 AI Art Revenue Exchange API running on http://${host}:${port}`);
  logger.log(`📚 API Documentation: http://${host}:${port}/api/v1/docs`);
  logger.log(`🔒 Environment: ${configService.get('NODE_ENV') || 'development'}`);

  // Log security configuration
  logger.log('🔐 Security Features Enabled:');
  logger.log('  - Helmet security headers');
  logger.log('  - CORS protection');
  logger.log('  - Request compression');
  logger.log('  - Input validation');
  logger.log('  - Rate limiting');
  logger.log('  - CSRF protection');
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
