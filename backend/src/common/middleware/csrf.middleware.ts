/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../redis/redis.service';
import { EncryptionService } from '../services/encryption.service';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  constructor(
    private readonly redis: RedisService,
    private readonly encryption: EncryptionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for safe methods
    if (this.safeMethods.includes(req.method)) {
      next();
      return;
    }

    // Skip for API endpoints that use JWT authentication
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    // Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'] as string;
    const csrfCookie = req.cookies['csrf-token'];

    if (!csrfToken || !csrfCookie) {
      res.status(403).json({
        success: false,
        error: 'CSRF token missing',
      });
      return;
    }

    // Validate token
    const isValid = await this.validateCsrfToken(csrfToken, csrfCookie);

    if (!isValid) {
      this.logger.warn(`CSRF validation failed: ${req.ip}`);
      res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
      });
      return;
    }

    next();
  }

  private async validateCsrfToken(token: string, cookie: string): Promise<boolean> {
    try {
      // Check if token matches cookie
      if (token !== cookie) {
        return false;
      }

      // Check if token is in valid format
      if (!/^[a-f0-9]{64}$/.test(token)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate new CSRF token
   */
  generateToken(): string {
    return this.encryption.generateToken(32);
  }
}
