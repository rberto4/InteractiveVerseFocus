import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TaskPlanService } from './task-plan.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CalendarService } from '../calendar/calendar.service';

@Controller('task-plans')
@UseGuards(JwtAuthGuard)
export class TaskPlanController {
  constructor(
    private readonly taskPlanService: TaskPlanService,
    private readonly calendarService: CalendarService,
  ) {}

  @Post('generate/:goalId')
  async generateTaskPlan(
    @CurrentUser() user: any,
    @Param('goalId') goalId: string,
  ) {
    return this.taskPlanService.generateTaskPlan(user.userId, goalId);
  }

  @Get('goal/:goalId')
  async getTaskPlan(
    @CurrentUser() user: any,
    @Param('goalId') goalId: string,
  ) {
    return this.taskPlanService.getTaskPlan(user.userId, goalId);
  }

  @Put(':planId/status')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
    @Body() body: { status: 'draft' | 'approved' | 'committed' | 'rejected' },
  ) {
    return this.taskPlanService.updateTaskPlanStatus(user.userId, planId, body.status);
  }

  @Post(':planId/schedule')
  async scheduleToCalendar(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
  ) {
    return this.taskPlanService.scheduleTasksToCalendar(user.userId, planId);
  }

    @Delete(':planId/task/:taskIndex')
  async deleteTask(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    const taskIndexNum = parseInt(taskIndex, 10);
    
    // Get the task plan to find the event ID
    const taskPlan = await this.taskPlanService.getTaskPlanById(user.userId, planId);
    if (!taskPlan || !(taskPlan as any).calendarEvents) {
      throw new Error('Task plan not found or has no calendar events');
    }

    const eventId = (taskPlan as any).calendarEvents[taskIndexNum];
    if (!eventId) {
      throw new Error('Calendar event not found for this task');
    }

    // Delete from calendar
    await this.calendarService.deleteEvent(user.userId, eventId);

    // Remove from task plan
    await this.taskPlanService.removeCalendarEventFromPlan(user.userId, planId, taskIndexNum);

    return {
      success: true,
      message: 'Task and calendar event deleted successfully',
    };
  }

  @Delete(':planId/events')
  async deleteAllEvents(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
  ) {
    // Get the task plan
    const taskPlan = await this.taskPlanService.getTaskPlanById(user.userId, planId);
    if (!taskPlan) {
      throw new Error('Task plan not found');
    }

    const calendarEventsObj = (taskPlan as any).calendarEvents || {};
    
    // Convert object to array of event IDs
    const eventIds = Object.values(calendarEventsObj).filter(id => id);
    
    // Delete all calendar events
    for (const eventId of eventIds) {
      try {
        await this.calendarService.deleteEvent(user.userId, eventId as string);
      } catch (error) {
        console.error(`Failed to delete event ${eventId}:`, error);
      }
    }

    // Clear calendar events from task plan
    await this.taskPlanService.clearCalendarEvents(user.userId, planId);

    return {
      success: true,
      message: `Deleted ${eventIds.length} calendar events`,
      count: eventIds.length,
    };
  }

  @Post('regenerate/:goalId')
  async regenerateTaskPlan(
    @CurrentUser() user: any,
    @Param('goalId') goalId: string,
  ) {
    // Get existing task plan
    const existingPlan = await this.taskPlanService.getTaskPlan(user.userId, goalId);
    
    let deletedEventsCount = 0;
    
    if (existingPlan) {
      // Delete all associated calendar events
      const calendarEventsObj = (existingPlan as any).calendarEvents || {};
      const eventIds = Object.values(calendarEventsObj).filter(id => id);
      
      for (const eventId of eventIds) {
        try {
          await this.calendarService.deleteEvent(user.userId, eventId as string);
          deletedEventsCount++;
        } catch (error) {
          console.error(`Failed to delete event ${eventId}:`, error);
        }
      }

      // Delete old task plan
      await this.taskPlanService.deleteTaskPlan(user.userId, existingPlan.id);
    }

    // Generate new task plan
    const newPlan = await this.taskPlanService.generateTaskPlan(user.userId, goalId);

    return {
      ...newPlan,
      regenerated: true,
      deletedEventsCount,
    };
  }
}

