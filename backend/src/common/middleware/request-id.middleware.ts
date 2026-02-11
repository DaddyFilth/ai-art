/**
 * Request ID Middleware
 * Assigns unique request IDs for tracing and logging
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EncryptionService } from '../services/encryption.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  constructor(private readonly encryption: EncryptionService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Get request ID from header or generate new one
    const requestId = (req.headers['x-request-id'] as string) || 
      this.encryption.generateUUID();

    // Attach to request
    (req as any).id = requestId;

    // Set response header
    res.setHeader('X-Request-Id', requestId);

    // Log request
    this.logger.debug(`[${requestId}] ${req.method} ${req.path}`);

    next();
  }
}
