/**
 * Prisma Service with Connection Management
 * Enterprise-grade database connection handling
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error', 'warn'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connection established');
      
      // Log connection pool stats
      this.logConnectionStats();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Execute a transaction with automatic retry logic
   */
  async executeTransaction<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 100, isolationLevel = Prisma.TransactionIsolationLevel.Serializable } = options;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          isolationLevel,
          maxWait: 5000,
          timeout: 10000,
        });
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (this.isRetryableError(error) && attempt < maxRetries) {
          this.logger.warn(`Transaction failed (attempt ${attempt}/${maxRetries}), retrying...`);
          await this.delay(retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Execute raw query with parameter sanitization
   */
  async executeRawQuery<T>(query: string, ...parameters: any[]): Promise<T> {
    // Validate query doesn't contain dangerous operations
    const dangerousPatterns = [
      /DROP\s+/i,
      /DELETE\s+FROM\s+\w+\s*$/i,
      /TRUNCATE\s+/i,
      /ALTER\s+/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error('Potentially dangerous query detected');
      }
    }
    
    return this.$queryRawUnsafe<T>(query, ...parameters);
  }

  /**
   * Clean up soft-deleted records older than retention period
   */
  async cleanupSoftDeleted(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // This would be implemented based on your soft delete strategy
    // Example for users table with deletedAt field
    const result = await this.$executeRaw`
      DELETE FROM users 
      WHERE deleted_at IS NOT NULL 
      AND deleted_at < ${cutoffDate}
    `;
    
    return result;
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P1001', // Can't reach database server
      'P1002', // Database server timeout
      'P1008', // Operations timed out
      'P1017', // Server has closed the connection
      'P2024', // Timed out fetching connection from pool
    ];
    
    return retryableCodes.includes(error?.code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logConnectionStats() {
    // Prisma doesn't expose connection pool stats directly
    // This is a placeholder for custom metrics collection
    this.logger.debug('Connection pool stats logged');
  }

  /**
   * Soft delete helper
   */
  async softDelete<T extends { id: string }>(
    model: string,
    id: string
  ): Promise<T> {
    return (this as any)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Find with soft delete filter
   */
  async findActive<T>(
    model: string,
    args: any = {}
  ): Promise<T[]> {
    return (this as any)[model].findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }
}
