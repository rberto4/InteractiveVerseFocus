import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class CalendarService {
    private prisma;
    private configService;
    private oauth2Client;
    constructor(prisma: PrismaService, configService: ConfigService);
    private getValidAccessToken;
    private refreshAccessToken;
    getEvents(userId: string, options?: {
        timeMin?: Date;
        timeMax?: Date;
        maxResults?: number;
    }): Promise<import("googleapis").calendar_v3.Schema$Event[]>;
    createEvent(userId: string, event: {
        summary: string;
        description?: string;
        start: Date;
        end: Date;
        location?: string;
    }): Promise<import("googleapis").calendar_v3.Schema$Event>;
    getCalendars(userId: string): Promise<import("googleapis").calendar_v3.Schema$CalendarListEntry[]>;
}
//# sourceMappingURL=calendar.service.d.ts.map