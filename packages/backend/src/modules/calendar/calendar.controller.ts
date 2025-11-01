import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * GET /calendar/events
   * Fetch calendar events for the authenticated user
   */
  @Get('events')
  async getEvents(
    @CurrentUser() user: any,
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
    @Query('maxResults') maxResults?: string,
  ) {
    const options: any = {};

    if (timeMin) options.timeMin = new Date(timeMin);
    if (timeMax) options.timeMax = new Date(timeMax);
    if (maxResults) options.maxResults = parseInt(maxResults, 10);

    return this.calendarService.getEvents(user.userId, options);
  }

  /**
   * POST /calendar/events
   * Create a new calendar event
   */
  @Post('events')
  async createEvent(
    @CurrentUser() user: any,
    @Body()
    body: {
      summary: string;
      description?: string;
      start: string;
      end: string;
      location?: string;
    },
  ) {
    return this.calendarService.createEvent(user.userId, {
      summary: body.summary,
      description: body.description,
      start: new Date(body.start),
      end: new Date(body.end),
      location: body.location,
    });
  }

  /**
   * GET /calendar/list
   * Get user's calendar list
   */
  @Get('list')
  async getCalendars(@CurrentUser() user: any) {
    return this.calendarService.getCalendars(user.userId);
  }

  /**
   * PUT /calendar/events/:eventId
   * Update an existing calendar event
   */
  @Put('events/:eventId')
  async updateEvent(
    @CurrentUser() user: any,
    @Param('eventId') eventId: string,
    @Body()
    body: {
      summary?: string;
      description?: string;
      start?: string;
      end?: string;
      location?: string;
    },
  ) {
    return this.calendarService.updateEvent(user.userId, eventId, {
      summary: body.summary,
      description: body.description,
      start: body.start ? new Date(body.start) : undefined,
      end: body.end ? new Date(body.end) : undefined,
      location: body.location,
    });
  }

  /**
   * DELETE /calendar/events/:eventId
   * Delete a calendar event
   */
  @Delete('events/:eventId')
  async deleteEvent(
    @CurrentUser() user: any,
    @Param('eventId') eventId: string,
  ) {
    return this.calendarService.deleteEvent(user.userId, eventId);
  }
}
