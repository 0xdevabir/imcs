import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommunicationModule } from '../communication/communication.module';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

@Module({
  imports: [
    CommunicationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev_secret_change_me',
    }),
  ],
  providers: [EventsGateway, EventsService],
})
export class EventsModule {}
