import { Module } from '@nestjs/common';
import { TaskPlanController } from './task-plan.controller';
import { TaskPlanService } from './task-plan.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [PrismaModule, CalendarModule],
  controllers: [TaskPlanController],
  providers: [TaskPlanService],
  exports: [TaskPlanService],
})
export class AIModule {}
