import { Module } from '@nestjs/common';
import { MatureService } from './mature.service';
import { MatureController } from './mature.controller';

@Module({
  controllers: [MatureController],
  providers: [MatureService],
  exports: [MatureService],
})
export class MatureModule {}
