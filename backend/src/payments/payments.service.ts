import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private client: paypal.core.PayPalHttpClient;

  constructor(private configService: ConfigService) {
    const clientId     = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const env          = this.configService.get<string>('NODE_ENV');

    const environment = env === 'production'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  // Token packages → USD price map
  private readonly PACKAGES: Record<string, { tokens: number; amount: string }> = {
    starter: { tokens: 50,   amount: '4.99'  },
    creator: { tokens: 150,  amount: '12.99' },
    pro:     { tokens: 350,  amount: '24.99' },
    studio:  { tokens: 1000, amount: '59.99' },
  };

  async createOrder(packageId: string, userId: string): Promise<{ orderId: string }> {
    const pkg = this.PACKAGES[packageId];
    if (!pkg) throw new BadRequestException('Invalid package');

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: pkg.amount,
          },
          description: `AI Art Exchange — ${pkg.tokens} tokens (${packageId})`,
          custom_id: `${userId}:${packageId}`,
        },
      ],
      application_context: {
        brand_name: 'AI Art Exchange',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${this.configService.get('FRONTEND_URL')}/wallet?payment=success`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/wallet?payment=cancelled`,
      },
    });

    try {
      const response = await this.client.execute(request);
      return { orderId: response.result.id };
    } catch (err) {
      this.logger.error('PayPal create order failed', err);
      throw new BadRequestException('Failed to create PayPal order');
    }
  }

  async captureOrder(orderId: string): Promise<{ tokens: number; packageId: string }> {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({} as any);

    try {
      const response = await this.client.execute(request);
      const unit     = response.result.purchase_units[0];
      const [userId, packageId] = (unit.payments.captures[0].custom_id as string).split(':');
      const pkg = this.PACKAGES[packageId];

      if (!pkg) throw new BadRequestException('Invalid package in order');

      this.logger.log(`PayPal capture success — user ${userId} purchased ${pkg.tokens} tokens`);
      return { tokens: pkg.tokens, packageId };
    } catch (err) {
      this.logger.error('PayPal capture failed', err);
      throw new BadRequestException('Failed to capture PayPal order');
    }
  }
}
