import { GoalsService, CreateGoalDto, UpdateGoalDto } from './goals.service';
import { FileExtractorService } from '../files/file-extractor.service';
export declare class GoalsController {
    private readonly goalsService;
    private readonly fileExtractorService;
    constructor(goalsService: GoalsService, fileExtractorService: FileExtractorService);
    create(user: any, createGoalDto: CreateGoalDto): Promise<{
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
    createWithFile(user: any, createGoalDto: CreateGoalDto, file: Express.Multer.File): Promise<{
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
    findAll(user: any, status?: string): Promise<({
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
    findOne(user: any, id: string): Promise<({
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
    update(user: any, id: string, updateGoalDto: UpdateGoalDto): Promise<import("@prisma/client").Prisma.BatchPayload>;
    delete(user: any, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
//# sourceMappingURL=goals.controller.d.ts.map