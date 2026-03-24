import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, AuthModule, EventsModule],
  controllers: [AppController],
})
export class AppModule {}
