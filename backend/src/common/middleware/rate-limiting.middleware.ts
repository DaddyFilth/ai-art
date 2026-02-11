/**
 * Rate Limiting Middleware
 * Advanced rate limiting with Redis backend
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitingMiddleware.name);

  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const clientId = this.getClientIdentifier(req);
    const route = req.route?.path || req.path;
    
    // Different limits for different routes
    const limits = this.getRouteLimits(route);
    
    const key = `ratelimit:${clientId}:${route}`;
    
    try {
      const result = await this.redis.rateLimit(
        key,
        limits.maxRequests,
        limits.windowSeconds
      );

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limits.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        this.logger.warn(`Rate limit exceeded: ${clientId} - ${route}`);
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil(result.resetTime - Date.now() / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      this.logger.error('Rate limiting error:', error.message);
      // Allow request on error to prevent blocking legitimate traffic
      next();
    }
  }

  private getClientIdentifier(req: Request): string {
    // Use authenticated user ID if available
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private getRouteLimits(route: string): { maxRequests: number; windowSeconds: number } {
    // Authentication endpoints - strict limits
    if (route.includes('/auth/login') || route.includes('/auth/register')) {
      return { maxRequests: 5, windowSeconds: 300 }; // 5 per 5 minutes
    }

    // Password reset - strict limits
    if (route.includes('/auth/password')) {
      return { maxRequests: 3, windowSeconds: 3600 }; // 3 per hour
    }

    // Payment endpoints - moderate limits
    if (route.includes('/payments') || route.includes('/stripe')) {
      return { maxRequests: 30, windowSeconds: 60 }; // 30 per minute
    }

    // AI generation - moderate limits
    if (route.includes('/ai/generate')) {
      return { maxRequests: 10, windowSeconds: 60 }; // 10 per minute
    }

    // Default - generous limits
    return { maxRequests: 100, windowSeconds: 60 }; // 100 per minute
  }
}
