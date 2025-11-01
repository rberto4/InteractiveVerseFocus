import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
export interface Subtask {
    title: string;
    description: string;
    estimatedDuration: number;
    priority: 'high' | 'medium' | 'low';
    suggestedStart?: string;
    suggestedEnd?: string;
    location?: string;
    recurrence?: {
        frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
        interval?: number;
        until?: string;
        count?: number;
        byDay?: string[];
    };
}
export interface TaskPlanResponse {
    subtasks: Subtask[];
    conflicts: string[];
    recommendations: string[];
}
export declare class TaskPlanService {
    private prisma;
    private configService;
    private calendarService;
    constructor(prisma: PrismaService, configService: ConfigService, calendarService: CalendarService);
    generateTaskPlan(userId: string, goalId: string): Promise<TaskPlanResponse>;
    private detectOverlaps;
    private buildPrompt;
    private callAI;
    private getMockResponse;
    private parseAIResponse;
    getTaskPlan(userId: string, goalId: string): Promise<{
        id: string;
        goalId: string;
        userId: string;
        status: string;
        subtasks: import("@prisma/client/runtime/library").JsonValue;
        conflicts: import("@prisma/client/runtime/library").JsonValue | null;
        calendarEvents: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    getTaskPlanById(userId: string, planId: string): Promise<{
        id: string;
        goalId: string;
        userId: string;
        status: string;
        subtasks: import("@prisma/client/runtime/library").JsonValue;
        conflicts: import("@prisma/client/runtime/library").JsonValue | null;
        calendarEvents: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    updateTaskPlanStatus(userId: string, planId: string, status: 'draft' | 'approved' | 'committed' | 'rejected'): Promise<import("@prisma/client").Prisma.BatchPayload>;
    scheduleTasksToCalendar(userId: string, planId: string): Promise<{
        success: boolean;
        createdEvents: {
            eventId: string | null | undefined;
            subtaskTitle: string;
            start: string;
            isRecurring: boolean;
        }[];
        message: string;
    }>;
    removeCalendarEventFromPlan(userId: string, planId: string, taskIndex: number): Promise<void>;
    clearCalendarEvents(userId: string, planId: string): Promise<void>;
    deleteTaskPlan(userId: string, planId: string): Promise<void>;
    private buildRRule;
    private formatRecurrence;
}
//# sourceMappingURL=task-plan.service.d.ts.map