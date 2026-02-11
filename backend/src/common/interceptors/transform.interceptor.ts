/**
 * Transform Interceptor
 * Standardizes API response format
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
  requestId?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = (request as any).id;

    return next.handle().pipe(
      map((data) => {
        // If response already has success field, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            requestId,
          };
        }

        // Standardize response
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}
