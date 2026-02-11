/**
 * AI Generation Controller
 * REST API endpoints for AI art generation
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService, GenerationRequest } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

class GenerateArtDto implements GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: string;
  model?: string;
}

@ApiTags('AI Generation')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI art' })
  @ApiResponse({ status: 201, description: 'Art generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid prompt or insufficient tokens' })
  async generate(
    @CurrentUser() user: User,
    @Body() dto: GenerateArtDto,
    @Ip() ip: string,
  ) {
    const result = await this.aiService.generateArt(user, dto, ip);

    return {
      success: true,
      data: {
        asset: result.asset,
        ownershipType: result.ownershipType,
        isAdminClaimed: result.isAdminClaimed,
      },
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get generation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.aiService.getGenerationHistory(user.id, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get generation statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@CurrentUser() user: User) {
    const stats = await this.aiService.getGenerationStats(user.id);

    return {
      success: true,
      data: stats,
    };
  }
}
