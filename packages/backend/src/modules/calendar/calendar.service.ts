import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class CalendarService {
  private oauth2Client: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );
  }

  /**
   * Get valid access token for user, refreshing if necessary
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    const authToken = await this.prisma.authToken.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google',
        },
      },
    });

    if (!authToken) {
      throw new UnauthorizedException('No auth token found for user');
    }

    // Check if token is expired
    const now = new Date();
    if (authToken.expiresAt && authToken.expiresAt <= now) {
      // Token expired, refresh it
      if (!authToken.refreshToken) {
        throw new UnauthorizedException('No refresh token available');
      }

      return this.refreshAccessToken(userId, authToken.refreshToken);
    }

    return authToken.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update token in database
      await this.prisma.authToken.update({
        where: {
          userId_provider: {
            userId,
            provider: 'google',
          },
        },
        data: {
          accessToken: credentials.access_token,
          expiresAt: new Date(credentials.expiry_date),
        },
      });

      return credentials.access_token;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Fetch calendar events for a user
   */
  async getEvents(
    userId: string,
    options?: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
    },
  ) {
    const accessToken = await this.getValidAccessToken(userId);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: options?.timeMin?.toISOString() || new Date().toISOString(),
        timeMax: options?.timeMax?.toISOString(),
        maxResults: options?.maxResults || 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new UnauthorizedException('Failed to fetch calendar events');
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    userId: string,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      recurrence?: string[]; // RRULE array for recurring events
    },
  ) {
    const accessToken = await this.getValidAccessToken(userId);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const requestBody: any = {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
      };

      // Add recurrence if provided
      if (event.recurrence && event.recurrence.length > 0) {
        requestBody.recurrence = event.recurrence;
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new UnauthorizedException('Failed to create calendar event');
    }
  }

  /**
   * Get user's calendar list
   */
  async getCalendars(userId: string) {
    const accessToken = await this.getValidAccessToken(userId);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new UnauthorizedException('Failed to fetch calendars');
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    eventData: {
      summary?: string;
      description?: string;
      start?: Date;
      end?: Date;
      location?: string;
    },
  ) {
    const accessToken = await this.getValidAccessToken(userId);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      console.log(`📝 Attempting to update calendar event: ${eventId}`);
      
      // First, get the current event to preserve fields we're not updating
      const currentEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      const updatedEvent: any = {
        summary: eventData.summary ?? currentEvent.data.summary,
        description: eventData.description ?? currentEvent.data.description,
        location: eventData.location ?? currentEvent.data.location,
      };

      if (eventData.start && eventData.end) {
        updatedEvent.start = {
          dateTime: eventData.start.toISOString(),
          timeZone: 'UTC',
        };
        updatedEvent.end = {
          dateTime: eventData.end.toISOString(),
          timeZone: 'UTC',
        };
      } else {
        updatedEvent.start = currentEvent.data.start;
        updatedEvent.end = currentEvent.data.end;
      }

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updatedEvent,
      });

      console.log(`✅ Updated calendar event: ${eventData.summary || currentEvent.data.summary}`);
      return response.data;
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // 410 Gone means already deleted
      if (error.code === 410 || error.status === 410) {
        throw new UnauthorizedException('Event has been deleted and cannot be updated');
      }
      
      if (error.code === 404) {
        throw new UnauthorizedException('Event not found in calendar');
      }
      if (error.code === 403) {
        throw new UnauthorizedException('No permission to update this event');
      }
      
      throw new UnauthorizedException(`Failed to update calendar event: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(userId: string, eventId: string) {
    const accessToken = await this.getValidAccessToken(userId);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      console.log(`🗑️ Attempting to delete calendar event: ${eventId}`);
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      console.log(`✅ Deleted calendar event: ${eventId}`);
      return { success: true, message: 'Event deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // 410 Gone means already deleted - treat as success
      if (error.code === 410 || error.status === 410) {
        console.log(`⚠️ Event ${eventId} was already deleted, treating as success`);
        return { success: true, message: 'Event already deleted' };
      }
      
      if (error.code === 404) {
        console.log(`⚠️ Event ${eventId} not found, treating as success`);
        return { success: true, message: 'Event not found (already deleted)' };
      }
      
      if (error.code === 403) {
        throw new UnauthorizedException('No permission to delete this event');
      }
      
      throw new UnauthorizedException(`Failed to delete calendar event: ${error.message || 'Unknown error'}`);
    }
  }
}
