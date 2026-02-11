/**
 * Redis Service for Caching and Session Management
 * Enterprise-grade caching with security considerations
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly keyPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix = process.env.NODE_ENV === 'production' ? 'prod:' : 'dev:';
  }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connection established');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error.message);
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.prefixedKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const prefixedKey = this.prefixedKey(key);
      
      if (ttlSeconds) {
        await this.client.setex(prefixedKey, ttlSeconds, serialized);
      } else {
        await this.client.set(prefixedKey, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error.message);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.prefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error.message);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.prefixedKey(key));
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(this.prefixedKey(key), seconds);
    } catch (error) {
      this.logger.error(`Cache expire error for key ${key}:`, error.message);
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(this.prefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(this.prefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache decrement error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(this.prefixedKey(key), ...members);
    } catch (error) {
      this.logger.error(`Cache sadd error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Remove from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(this.prefixedKey(key), ...members);
    } catch (error) {
      this.logger.error(`Cache srem error for key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(this.prefixedKey(key), member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache sismember error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(this.prefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache smembers error for key ${key}:`, error.message);
      return [];
    }
  }

  /**
   * Rate limiting helper
   */
  async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;
    
    try {
      const current = await this.incr(windowKey);
      
      if (current === 1) {
        await this.expire(windowKey, windowSeconds);
      }
      
      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      const resetTime = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
      
      return { allowed, remaining, resetTime };
    } catch (error) {
      this.logger.error(`Rate limit error for key ${key}:`, error.message);
      return { allowed: false, remaining: 0, resetTime: now + windowSeconds };
    }
  }

  /**
   * Session management
   */
  async setSession(
    sessionId: string,
    data: Record<string, any>,
    ttlSeconds: number = 3600
  ): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttlSeconds);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  /**
   * Token blacklist for logout
   */
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    await this.set(`blacklist:${token}`, { blacklisted: true }, expiresIn);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.get(`blacklist:${token}`);
    return result !== null;
  }

  /**
   * Cache invalidation patterns
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(this.prefixedKey(pattern));
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error:`, error.message);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    
    try {
      await this.client.ping();
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

  /**
   * Get raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  private prefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
