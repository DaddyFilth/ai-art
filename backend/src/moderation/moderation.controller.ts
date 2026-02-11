/**
 * Moderation Controller
 * Content reporting and moderation endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService, ContentReportInput, ModerationActionInput } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

class ContentReportDto implements ContentReportInput {
  reportedUserId?: string;
  assetId?: string;
  reportType: any;
  reason: string;
}

class ModerationActionDto implements ModerationActionInput {
  reportId: string;
  action: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'BAN_USER' | 'REMOVE_CONTENT';
  notes?: string;
}

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit content report' })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  async submitReport(
    @CurrentUser() user: User,
    @Body() dto: ContentReportDto,
  ) {
    await this.moderationService.submitReport(user.id, dto);

    return {
      success: true,
      message: 'Report submitted successfully',
    };
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending reports (moderators only)' })
  @ApiResponse({ status: 200, description: 'Reports retrieved' })
  async getPendingReports(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.moderationService.getPendingReports({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      success: true,
      data: result.reports,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Post('actions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process moderation action (moderators only)' })
  @ApiResponse({ status: 200, description: 'Action processed' })
  async processAction(
    @CurrentUser() user: User,
    @Body() dto: ModerationActionDto,
  ) {
    await this.moderationService.processAction(user.id, dto);

    return {
      success: true,
      message: 'Moderation action processed',
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get moderation statistics (moderators only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats() {
    const stats = await this.moderationService.getStats();

    return {
      success: true,
      data: stats,
    };
  }
}
