/**
 * Security Headers Middleware
 * Additional security headers beyond Helmet
 * Note: X-XSS-Protection header has been removed as it's deprecated by modern browsers
 * in favor of Content Security Policy (CSP), which we enforce via Helmet
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Prevent MIME type sniffing (already set by Helmet, but redundant for defense-in-depth)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking (already set by Helmet)
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    next();
  }
}
