"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const googleapis_1 = require("googleapis");
let CalendarService = class CalendarService {
    prisma;
    configService;
    oauth2Client;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(this.configService.get('GOOGLE_CLIENT_ID'), this.configService.get('GOOGLE_CLIENT_SECRET'));
    }
    async getValidAccessToken(userId) {
        const authToken = await this.prisma.authToken.findUnique({
            where: {
                userId_provider: {
                    userId,
                    provider: 'google',
                },
            },
        });
        if (!authToken) {
            throw new common_1.UnauthorizedException('No auth token found for user');
        }
        const now = new Date();
        if (authToken.expiresAt && authToken.expiresAt <= now) {
            if (!authToken.refreshToken) {
                throw new common_1.UnauthorizedException('No refresh token available');
            }
            return this.refreshAccessToken(userId, authToken.refreshToken);
        }
        return authToken.accessToken;
    }
    async refreshAccessToken(userId, refreshToken) {
        try {
            this.oauth2Client.setCredentials({
                refresh_token: refreshToken,
            });
            const { credentials } = await this.oauth2Client.refreshAccessToken();
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
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Failed to refresh access token');
        }
    }
    async getEvents(userId, options) {
        const accessToken = await this.getValidAccessToken(userId);
        this.oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
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
        }
        catch (error) {
            console.error('Error fetching calendar events:', error);
            throw new common_1.UnauthorizedException('Failed to fetch calendar events');
        }
    }
    async createEvent(userId, event) {
        const accessToken = await this.getValidAccessToken(userId);
        this.oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
        try {
            const requestBody = {
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
            if (event.recurrence && event.recurrence.length > 0) {
                requestBody.recurrence = event.recurrence;
            }
            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody,
            });
            return response.data;
        }
        catch (error) {
            console.error('Error creating calendar event:', error);
            throw new common_1.UnauthorizedException('Failed to create calendar event');
        }
    }
    async getCalendars(userId) {
        const accessToken = await this.getValidAccessToken(userId);
        this.oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
        try {
            const response = await calendar.calendarList.list();
            return response.data.items || [];
        }
        catch (error) {
            console.error('Error fetching calendars:', error);
            throw new common_1.UnauthorizedException('Failed to fetch calendars');
        }
    }
    async updateEvent(userId, eventId, eventData) {
        const accessToken = await this.getValidAccessToken(userId);
        this.oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
        try {
            console.log(`📝 Attempting to update calendar event: ${eventId}`);
            const currentEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: eventId,
            });
            const updatedEvent = {
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
            }
            else {
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
        }
        catch (error) {
            console.error('Error updating calendar event:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            if (error.code === 410 || error.status === 410) {
                throw new common_1.UnauthorizedException('Event has been deleted and cannot be updated');
            }
            if (error.code === 404) {
                throw new common_1.UnauthorizedException('Event not found in calendar');
            }
            if (error.code === 403) {
                throw new common_1.UnauthorizedException('No permission to update this event');
            }
            throw new common_1.UnauthorizedException(`Failed to update calendar event: ${error.message || 'Unknown error'}`);
        }
    }
    async deleteEvent(userId, eventId) {
        const accessToken = await this.getValidAccessToken(userId);
        this.oauth2Client.setCredentials({
            access_token: accessToken,
        });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
        try {
            console.log(`🗑️ Attempting to delete calendar event: ${eventId}`);
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
            });
            console.log(`✅ Deleted calendar event: ${eventId}`);
            return { success: true, message: 'Event deleted successfully' };
        }
        catch (error) {
            console.error('Error deleting calendar event:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            if (error.code === 410 || error.status === 410) {
                console.log(`⚠️ Event ${eventId} was already deleted, treating as success`);
                return { success: true, message: 'Event already deleted' };
            }
            if (error.code === 404) {
                console.log(`⚠️ Event ${eventId} not found, treating as success`);
                return { success: true, message: 'Event not found (already deleted)' };
            }
            if (error.code === 403) {
                throw new common_1.UnauthorizedException('No permission to delete this event');
            }
            throw new common_1.UnauthorizedException(`Failed to delete calendar event: ${error.message || 'Unknown error'}`);
        }
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map