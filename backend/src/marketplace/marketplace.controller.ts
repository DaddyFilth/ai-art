/**
 * Marketplace Controller
 * REST API endpoints for auctions and marketplace
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService, CreateAuctionInput, PlaceBidInput } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

class CreateAuctionDto implements CreateAuctionInput {
  assetId: string;
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  startsAt?: Date;
  endsAt: Date;
}

class PlaceBidDto implements PlaceBidInput {
  auctionId: string;
  amount: number;
  maxBid?: number;
}

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('auctions')
  @ApiOperation({ summary: 'Get active auctions' })
  @ApiResponse({ status: 200, description: 'Auctions retrieved successfully' })
  async getActiveAuctions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.marketplaceService.getActiveAuctions({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      search,
    });

    return {
      success: true,
      data: result.auctions,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Get('auctions/:id')
  @ApiOperation({ summary: 'Get auction details' })
  @ApiResponse({ status: 200, description: 'Auction details retrieved' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async getAuctionDetails(@Param('id') id: string) {
    const auction = await this.marketplaceService.getAuctionDetails(id);

    return {
      success: true,
      data: auction,
    };
  }

  @Post('auctions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new auction' })
  @ApiResponse({ status: 201, description: 'Auction created successfully' })
  async createAuction(
    @CurrentUser() user: User,
    @Body() dto: CreateAuctionDto,
  ) {
    const auction = await this.marketplaceService.createAuction(user, dto);

    return {
      success: true,
      data: auction,
    };
  }

  @Post('bids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a bid' })
  @ApiResponse({ status: 201, description: 'Bid placed successfully' })
  async placeBid(
    @CurrentUser() user: User,
    @Body() dto: PlaceBidDto,
  ) {
    const bid = await this.marketplaceService.placeBid(user, dto);

    return {
      success: true,
      data: bid,
    };
  }

  @Get('my-bids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my bids' })
  @ApiResponse({ status: 200, description: 'Bids retrieved successfully' })
  async getMyBids(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.marketplaceService.getUserBids(user.id, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      success: true,
      data: result.bids,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Delete('auctions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel auction' })
  @ApiResponse({ status: 200, description: 'Auction cancelled successfully' })
  async cancelAuction(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    await this.marketplaceService.cancelAuction(user.id, id);

    return {
      success: true,
      message: 'Auction cancelled successfully',
    };
  }
}
