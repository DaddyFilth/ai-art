/**
 * Mature Content Controller
 * Handles mature content routes with age verification
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MatureService, AgeVerificationInput, MatureAccessInput } from './mature.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatureContentGuard } from '../auth/guards/mature-content.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { Mature } from '../common/decorators/mature.decorator';

class AgeVerificationDto implements AgeVerificationInput {
  documentType: string;
  documentNumber: string;
  verificationData: string;
}

class MatureAccessDto implements MatureAccessInput {
  password: string;
}

@ApiTags('Mature Content')
@Controller('mature')
export class MatureController {
  constructor(private readonly matureService: MatureService) {}

  @Post('verify-age')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit age verification' })
  @ApiResponse({ status: 201, description: 'Verification submitted' })
  async submitAgeVerification(
    @CurrentUser() user: User,
    @Body() dto: AgeVerificationDto,
    @Headers('x-forwarded-for') ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.matureService.submitAgeVerification(user.id, dto, ipAddress, userAgent);

    return {
      success: true,
      message: 'Age verification submitted for review',
    };
  }

  @Post('enable-access')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable mature content access' })
  @ApiResponse({ status: 200, description: 'Mature access enabled' })
  async enableMatureAccess(
    @CurrentUser() user: User,
    @Body() dto: MatureAccessDto,
  ) {
    await this.matureService.enableMatureAccess(user, dto);

    return {
      success: true,
      message: 'Mature content access enabled',
    };
  }

  @Get('content')
  @UseGuards(JwtAuthGuard, MatureContentGuard)
  @Mature()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mature content feed' })
  @ApiResponse({ status: 200, description: 'Mature content retrieved' })
  @ApiResponse({ status: 403, description: 'Mature access not enabled' })
  async getMatureContent(
    @CurrentUser() user: User,
    @Headers('x-mature-password') maturePassword: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Verify mature password
    const isValid = await this.matureService.verifyMaturePassword(user.id, maturePassword);
    if (!isValid) {
      throw new ForbiddenException('Invalid mature content password');
    }

    const result = await this.matureService.getMatureContent({
      userId: user.id,
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

  @Post('disable-access')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable mature content access' })
  @ApiResponse({ status: 200, description: 'Mature access disabled' })
  async disableMatureAccess(@CurrentUser() user: User) {
    await this.matureService.disableMatureAccess(user.id);

    return {
      success: true,
      message: 'Mature content access disabled',
    };
  }
}
