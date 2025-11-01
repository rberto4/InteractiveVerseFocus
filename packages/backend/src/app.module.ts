import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { GoalsModule } from './modules/goals/goals.module';
import { AIModule } from './modules/ai/ai.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CalendarModule,
    GoalsModule,
    AIModule,
    UsersModule,
  ],
})
export class AppModule {}
