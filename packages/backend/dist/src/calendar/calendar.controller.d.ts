import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getEvents(user: any, timeMin?: string, timeMax?: string, maxResults?: string): Promise<import("googleapis").calendar_v3.Schema$Event[]>;
    createEvent(user: any, body: {
        summary: string;
        description?: string;
        start: string;
        end: string;
        location?: string;
    }): Promise<import("googleapis").calendar_v3.Schema$Event>;
    getCalendars(user: any): Promise<import("googleapis").calendar_v3.Schema$CalendarListEntry[]>;
}
//# sourceMappingURL=calendar.controller.d.ts.map