/**
 * Health Check Module
 * Provides health and readiness endpoints for monitoring
 */

import { Module, Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  async health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV') || 'development',
      version: '1.0.0',
    };
  }

  @Get('health/ready')
  async readiness() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'connected',
        },
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'disconnected',
        },
        error: error.message,
      };
    }
  }

  @Get('health/live')
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
