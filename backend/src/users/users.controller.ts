/**
 * Users Controller
 * User profile endpoints
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

class UpdateProfileDto {
  displayName?: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
}

class UpdateDataSharingDto {
  enabled: boolean;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getMyProfile(@CurrentUser() user: User) {
    const profile = await this.usersService.getProfile(user.id);

    return {
      success: true,
      data: profile,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(user.id, dto);

    return {
      success: true,
      data: profile,
    };
  }

  @Patch('me/data-sharing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update data sharing preference' })
  @ApiResponse({ status: 200, description: 'Preference updated' })
  async updateDataSharing(
    @CurrentUser() user: User,
    @Body() dto: UpdateDataSharingDto,
  ) {
    await this.usersService.updateDataSharing(user.id, dto.enabled);

    return {
      success: true,
      message: `Data sharing ${dto.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  @Get(':username')
  @Public()
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getPublicProfile(@Param('username') username: string) {
    const profile = await this.usersService.getPublicProfile(username);

    return {
      success: true,
      data: profile,
    };
  }
}
