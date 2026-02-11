/**
 * Global Exception Filter
 * Handles all exceptions and returns standardized error responses
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).id || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = null;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).error || errorCode;
        details = (exceptionResponse as any).details;
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = `PRISMA_${exception.code}`;
      
      switch (exception.code) {
        case 'P2002':
          message = 'Unique constraint violation';
          details = { field: exception.meta?.target };
          break;
        case 'P2003':
          message = 'Foreign key constraint violation';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          message = 'Database error';
      }
    }
    // Handle validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation error';
      errorCode = 'VALIDATION_ERROR';
    }
    // Handle other errors
    else if (exception instanceof Error) {
      message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : exception.message;
      
      this.logger.error(
        `[${requestId}] Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Log error
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Send response
    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
