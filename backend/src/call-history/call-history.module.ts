import { Module } from '@nestjs/common';
import { CallHistoryService } from './call-history.service';
import { CallHistoryController } from './call-history.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CallHistoryController],
  providers: [CallHistoryService],
  exports: [CallHistoryService],
})
export class CallHistoryModule {}
