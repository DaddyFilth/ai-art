import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {

  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  // Step 1: Frontend calls this to create a PayPal order
  @Post('create-order')
  async createOrder(
    @Body('packageId') packageId: string,
    @Request() req: any,
  ) {
    return this.paymentsService.createOrder(packageId, req.user.id);
  }

  // Step 2: Frontend calls this after PayPal approves payment
  @Post('capture-order/:orderId')
  async captureOrder(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ) {
    const result = await this.paymentsService.captureOrder(orderId);
    // Credit tokens to user wallet here via WalletsService
    return result;
  }
}
