/**
 * Analytics Controller
 * Analytics and reporting endpoints
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getDashboardAnalytics() {
    const data = await this.analyticsService.getDashboardData();

    return {
      success: true,
      data,
    };
  }

  @Get('my-activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user activity analytics' })
  @ApiResponse({ status: 200, description: 'Activity data retrieved' })
  async getMyActivity(@CurrentUser() user: User) {
    const data = await this.analyticsService.getUserActivity(user.id);

    return {
      success: true,
      data,
    };
  }
}
