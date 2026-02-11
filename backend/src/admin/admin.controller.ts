/**
 * Admin Controller
 * Administrative endpoints for platform management
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

class BanUserDto {
  isBanned: boolean;
  reason?: string;
}

class SetRoleDto {
  role: string;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getPlatformStats() {
    const stats = await this.adminService.getPlatformStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved' })
  async getRevenueStats() {
    const stats = await this.adminService.getRevenueStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async getUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.adminService.getUsers({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      search,
    });

    return {
      success: true,
      data: result.users,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: 'Ban or unban user' })
  @ApiResponse({ status: 200, description: 'User ban status updated' })
  async setUserBanStatus(
    @Param('id') userId: string,
    @Body() dto: BanUserDto,
  ) {
    await this.adminService.setUserBanStatus(userId, dto.isBanned, dto.reason);

    return {
      success: true,
      message: `User ${dto.isBanned ? 'banned' : 'unbanned'} successfully`,
    };
  }

  @Post('users/:id/role')
  @ApiOperation({ summary: 'Set user role' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async setUserRole(
    @Param('id') userId: string,
    @Body() dto: SetRoleDto,
  ) {
    await this.adminService.setUserRole(userId, dto.role);

    return {
      success: true,
      message: 'User role updated successfully',
    };
  }
}
