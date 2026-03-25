import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
