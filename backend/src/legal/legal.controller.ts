/**
 * Legal Controller
 * Legal documents and consent management endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LegalService, ConsentRecord } from './legal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

class ConsentDto {
  consentType: string;
  action: 'ACCEPTED' | 'DECLINED';
}

@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('documents/:type')
  @Public()
  @ApiOperation({ summary: 'Get legal document' })
  @ApiResponse({ status: 200, description: 'Document retrieved' })
  getDocument(@Param('type') type: string) {
    const document = this.legalService.getLegalDocument(type);

    return {
      success: true,
      data: document,
    };
  }

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record user consent' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async recordConsent(
    @CurrentUser() user: User,
    @Body() dto: ConsentDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.legalService.recordConsent({
      userId: user.id,
      consentType: dto.consentType as any,
      action: dto.action,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Consent recorded successfully',
    };
  }

  @Get('consent/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user consent history' })
  @ApiResponse({ status: 200, description: 'Consent history retrieved' })
  async getConsentHistory(@CurrentUser() user: User) {
    const history = await this.legalService.getConsentHistory(user.id);

    return {
      success: true,
      data: history,
    };
  }

  @Get('consent/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check required document acceptance status' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  async getConsentStatus(@CurrentUser() user: User) {
    const status = await this.legalService.hasAcceptedRequiredDocuments(user.id);

    return {
      success: true,
      data: status,
    };
  }
}
