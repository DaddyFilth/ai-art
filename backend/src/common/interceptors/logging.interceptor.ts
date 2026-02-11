/**
 * Logging Interceptor
 * Logs all requests with timing and response information
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request as any).id || 'unknown';
    const userId = (request as any).user?.id;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;
          
          this.logger.log(
            `[${requestId}] ${request.method} ${request.path} - ${statusCode} - ${duration}ms${
              userId ? ` - User: ${userId}` : ''
            }`
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          this.logger.error(
            `[${requestId}] ${request.method} ${request.path} - ${statusCode} - ${duration}ms - Error: ${error.message}`
          );
        },
      })
    );
  }
}
