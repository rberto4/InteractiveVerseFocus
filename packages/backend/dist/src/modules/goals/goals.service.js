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
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let GoalsService = class GoalsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, data) {
        return this.prisma.goal.create({
            data: {
                userId,
                title: data.title,
                description: data.description,
                deadline: data.deadline,
                priority: data.priority || 'medium',
            },
        });
    }
    async createWithFile(userId, data, fileData) {
        return this.prisma.goal.create({
            data: {
                userId,
                title: data.title,
                description: data.description,
                deadline: data.deadline,
                priority: data.priority || 'medium',
                attachedFileName: fileData.fileName,
                attachedFileType: fileData.fileType,
                extractedContent: fileData.extractedContent,
            },
        });
    }
    async findAll(userId, status) {
        const where = { userId };
        if (status) {
            where.status = status;
        }
        return this.prisma.goal.findMany({
            where,
            orderBy: [
                { deadline: 'asc' },
                { createdAt: 'desc' },
            ],
            include: {
                taskPlans: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
    }
    async findOne(userId, id) {
        return this.prisma.goal.findFirst({
            where: { id, userId },
            include: {
                taskPlans: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async update(userId, id, data) {
        return this.prisma.goal.updateMany({
            where: { id, userId },
            data,
        });
    }
    async delete(userId, id) {
        return this.prisma.goal.deleteMany({
            where: { id, userId },
        });
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map