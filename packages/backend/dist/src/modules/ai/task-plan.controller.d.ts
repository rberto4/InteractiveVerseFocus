import { TaskPlanService } from './task-plan.service';
import { CalendarService } from '../calendar/calendar.service';
export declare class TaskPlanController {
    private readonly taskPlanService;
    private readonly calendarService;
    constructor(taskPlanService: TaskPlanService, calendarService: CalendarService);
    generateTaskPlan(user: any, goalId: string): Promise<import("./task-plan.service").TaskPlanResponse>;
    getTaskPlan(user: any, goalId: string): Promise<{
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
    updateStatus(user: any, planId: string, body: {
        status: 'draft' | 'approved' | 'committed' | 'rejected';
    }): Promise<import("@prisma/client").Prisma.BatchPayload>;
    scheduleToCalendar(user: any, planId: string): Promise<{
        success: boolean;
        createdEvents: {
            eventId: string | null | undefined;
            subtaskTitle: string;
            start: string;
            isRecurring: boolean;
        }[];
        message: string;
    }>;
    deleteTask(user: any, planId: string, taskIndex: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAllEvents(user: any, planId: string): Promise<{
        success: boolean;
        message: string;
        count: number;
    }>;
    regenerateTaskPlan(user: any, goalId: string): Promise<{
        regenerated: boolean;
        deletedEventsCount: number;
        subtasks: import("./task-plan.service").Subtask[];
        conflicts: string[];
        recommendations: string[];
    }>;
}
//# sourceMappingURL=task-plan.controller.d.ts.map