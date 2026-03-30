import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CallHistoryModule } from './call-history/call-history.module';
import { CommunicationModule } from './communication/communication.module';
import { EventsModule } from './events/events.module';
import { FilesModule } from './files/files.module';
import { GroupsModule } from './groups/groups.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    EventsModule,
    FilesModule,
    GroupsModule,
    CommunicationModule,
    CallHistoryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
