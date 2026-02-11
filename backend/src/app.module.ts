/**
 * AI Art Revenue Exchange - Root Application Module
 * Enterprise-grade module organization with security-first architecture
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssetsModule } from './assets/assets.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TokensModule } from './tokens/tokens.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { ModerationModule } from './moderation/moderation.module';
import { MatureModule } from './mature/mature.module';
import { LegalModule } from './legal/legal.module';
import { AdminModule } from './admin/admin.module';
import { JobsModule } from './jobs/jobs.module';
import { LedgerModule } from './ledger/ledger.module';
import { AnalyticsModule } from './analytics/analytics.module';

// Common
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RateLimitingMiddleware } from './common/middleware/rate-limiting.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Configuration validation
import { configValidationSchema } from './config/config.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : '.env.development',
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL') || 60000,
            limit: config.get<number>('THROTTLE_LIMIT') || 100,
          },
          {
            name: 'auth',
            ttl: 300000, // 5 minutes
            limit: 5, // 5 attempts
          },
          {
            name: 'sensitive',
            ttl: 60000, // 1 minute
            limit: 10, // 10 attempts
          },
        ],
      }),
    }),

    // Scheduled Jobs
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,
    RedisModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    AssetsModule,
    MarketplaceModule,
    WalletsModule,
    TransactionsModule,
    TokensModule,
    PaymentsModule,
    AiModule,
    ModerationModule,
    MatureModule,
    LegalModule,
    AdminModule,
    JobsModule,
    LedgerModule,
    AnalyticsModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware in order
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*')
      .apply(RateLimitingMiddleware)
      .forRoutes('*')
      .apply(CsrfMiddleware)
      .forRoutes(
        'api/v1/auth/*',
        'api/v1/payments/*',
        'api/v1/wallets/*',
        'api/v1/transactions/*',
      );
  }
}
