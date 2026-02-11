/**
 * Payments Controller
 * REST API endpoints for Stripe payments
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  Req,
  RawBody,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService, CreatePaymentIntentInput } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { Request } from 'express';

class CreateDepositDto implements CreatePaymentIntentInput {
  amount: number;
  currency?: string;
  description?: string;
}

class CreateTokenPurchaseDto {
  packageId: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('packages')
  @ApiOperation({ summary: 'Get available token packages' })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  async getTokenPackages() {
    const packages = this.paymentsService.getTokenPackages();

    return {
      success: true,
      data: packages,
    };
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create deposit payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createDeposit(
    @CurrentUser() user: User,
    @Body() dto: CreateDepositDto,
  ) {
    const paymentIntent = await this.paymentsService.createDepositIntent(user, dto);

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    };
  }

  @Post('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create token purchase payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createTokenPurchase(
    @CurrentUser() user: User,
    @Body() dto: CreateTokenPurchaseDto,
  ) {
    const result = await this.paymentsService.createTokenPurchaseIntent(
      user,
      dto.packageId,
    );

    return {
      success: true,
      data: {
        clientSecret: result.paymentIntent.client_secret,
        paymentIntentId: result.paymentIntent.id,
        package: result.package,
      },
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getPaymentHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.paymentsService.getPaymentHistory(user.id, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      success: true,
      data: result.payments,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @RawBody() rawBody: string,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.processWebhook(rawBody, signature);

    return {
      success: true,
      message: 'Webhook processed',
    };
  }
}
