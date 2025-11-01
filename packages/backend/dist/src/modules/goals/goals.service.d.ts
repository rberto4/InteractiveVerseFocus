import { PrismaService } from '../../prisma/prisma.service';
export interface CreateGoalDto {
    title: string;
    description?: string;
    deadline: Date;
    priority?: 'low' | 'medium' | 'high';
}
export interface UpdateGoalDto {
    title?: string;
    description?: string;
    deadline?: Date;
    priority?: 'low' | 'medium' | 'high';
    status?: 'active' | 'completed' | 'cancelled';
}
export declare class GoalsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, data: CreateGoalDto): Promise<{
        id: string;
        title: string;
        description: string | null;
        deadline: Date;
        priority: string;
        status: string;
        attachedFileName: string | null;
        attachedFileType: string | null;
        extractedContent: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    createWithFile(userId: string, data: CreateGoalDto, fileData: {
        fileName: string;
        fileType: string;
        extractedContent: string;
    }): Promise<{
        id: string;
        title: string;
        description: string | null;
        deadline: Date;
        priority: string;
        status: string;
        attachedFileName: string | null;
        attachedFileType: string | null;
        extractedContent: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    findAll(userId: string, status?: string): Promise<({
        taskPlans: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            goalId: string;
            subtasks: import("@prisma/client/runtime/library").JsonValue;
            conflicts: import("@prisma/client/runtime/library").JsonValue | null;
            calendarEvents: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        title: string;
        description: string | null;
        deadline: Date;
        priority: string;
        status: string;
        attachedFileName: string | null;
        attachedFileType: string | null;
        extractedContent: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    })[]>;
    findOne(userId: string, id: string): Promise<({
        taskPlans: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            goalId: string;
            subtasks: import("@prisma/client/runtime/library").JsonValue;
            conflicts: import("@prisma/client/runtime/library").JsonValue | null;
            calendarEvents: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        title: string;
        description: string | null;
        deadline: Date;
        priority: string;
        status: string;
        attachedFileName: string | null;
        attachedFileType: string | null;
        extractedContent: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }) | null>;
    update(userId: string, id: string, data: UpdateGoalDto): Promise<import("@prisma/client").Prisma.BatchPayload>;
    delete(userId: string, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
//# sourceMappingURL=goals.service.d.ts.map