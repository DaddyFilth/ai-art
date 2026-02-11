import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [MarketplaceModule, LedgerModule],
  providers: [JobsService],
})
export class JobsModule {}
