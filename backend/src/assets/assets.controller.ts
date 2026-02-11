/**
 * Assets Controller
 * Asset management endpoints
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

class UpdateAssetDto {
  title?: string;
  description?: string;
  isForSale?: boolean;
}

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('feed')
  @Public()
  @ApiOperation({ summary: 'Get public assets feed' })
  @ApiResponse({ status: 200, description: 'Feed retrieved' })
  async getPublicFeed(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.assetsService.getPublicFeed({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      search,
    });

    return {
      success: true,
      data: result.assets,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Get('my-assets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my assets' })
  @ApiResponse({ status: 200, description: 'Assets retrieved' })
  async getMyAssets(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.assetsService.getUserAssets(user.id, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      success: true,
      data: result.assets,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset retrieved' })
  async getAsset(@Param('id') id: string) {
    const asset = await this.assetsService.getAsset(id);

    return {
      success: true,
      data: asset,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  async updateAsset(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    const asset = await this.assetsService.updateAsset(id, user.id, dto);

    return {
      success: true,
      data: asset,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted' })
  async deleteAsset(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    await this.assetsService.deleteAsset(id, user.id);

    return {
      success: true,
      message: 'Asset deleted successfully',
    };
  }
}
