/**
 * Tokens Controller
 * REST API endpoints for in-game token economy
 */

import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

class CreateReferralDto {
  referredId: string;
}

@ApiTags('Tokens')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get token balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@CurrentUser() user: User) {
    const balance = await this.tokensService.getBalance(user.id);

    return {
      success: true,
      data: {
        balance: balance.balance.toString(),
        totalEarned: balance.totalEarned.toString(),
        totalSpent: balance.totalSpent.toString(),
      },
    };
  }

  @Post('daily-login')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim daily login reward' })
  @ApiResponse({ status: 200, description: 'Daily login reward claimed' })
  async claimDailyLogin(
    @CurrentUser() user: User,
    @Body('ipAddress') ipAddress?: string,
  ) {
    const result = await this.tokensService.processDailyLogin(user.id, ipAddress);

    return {
      success: true,
      data: result,
    };
  }

  @Post('ad-view')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim ad view reward' })
  @ApiResponse({ status: 200, description: 'Ad view reward claimed' })
  async claimAdView(@CurrentUser() user: User) {
    const result = await this.tokensService.processAdViewReward(user.id);

    return {
      success: true,
      data: result,
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get token transaction history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.tokensService.getTransactionHistory(user.id, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      success: true,
      data: result.transactions,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Get('challenges')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active challenges' })
  @ApiResponse({ status: 200, description: 'Challenges retrieved successfully' })
  async getActiveChallenges() {
    const challenges = await this.tokensService.getActiveChallenges();

    return {
      success: true,
      data: challenges,
    };
  }

  @Get('referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral stats' })
  @ApiResponse({ status: 200, description: 'Referral stats retrieved' })
  async getReferralStats(@CurrentUser() user: User) {
    const stats = await this.tokensService.getReferralStats(user.id);

    return {
      success: true,
      data: {
        totalReferrals: stats.totalReferrals,
        convertedReferrals: stats.convertedReferrals,
        totalEarned: stats.totalEarned.toString(),
      },
    };
  }

  @Post('referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create referral' })
  @ApiResponse({ status: 201, description: 'Referral created' })
  async createReferral(
    @CurrentUser() user: User,
    @Body() dto: CreateReferralDto,
  ) {
    await this.tokensService.createReferral(user.id, dto.referredId);

    return {
      success: true,
      message: 'Referral created successfully',
    };
  }
}
