import { Injectable } from '@nestjs/common';
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

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateGoalDto) {
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

  async createWithFile(
    userId: string,
    data: CreateGoalDto,
    fileData: {
      fileName: string;
      fileType: string;
      extractedContent: string;
    },
  ) {
    // Store extracted content separately - do NOT mix with user's description
    return this.prisma.goal.create({
      data: {
        userId,
        title: data.title,
        description: data.description, // Keep original user description clean
        deadline: data.deadline,
        priority: data.priority || 'medium',
        attachedFileName: fileData.fileName,
        attachedFileType: fileData.fileType,
        extractedContent: fileData.extractedContent, // Store separately for AI use only
      },
    });
  }

  async findAll(userId: string, status?: string) {
    const where: any = { userId };
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

  async findOne(userId: string, id: string) {
    return this.prisma.goal.findFirst({
      where: { id, userId },
      include: {
        taskPlans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(userId: string, id: string, data: UpdateGoalDto) {
    return this.prisma.goal.updateMany({
      where: { id, userId },
      data,
    });
  }

  async delete(userId: string, id: string) {
    return this.prisma.goal.deleteMany({
      where: { id, userId },
    });
  }
}
