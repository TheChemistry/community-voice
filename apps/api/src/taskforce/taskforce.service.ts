import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TaskForceService {
  constructor(private prisma: PrismaService) {}

  async createTaskForce(creatorId: string, input: any) {
    return this.prisma.taskForce.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        scheduledAt: input.scheduledAt,
        creatorId,
      },
      include: {
        creator: true,
        volunteers: true,
      },
    });
  }

  async joinTaskForce(userId: string, taskForceId: string) {
    return this.prisma.volunteer.create({
      data: {
        userId,
        taskForceId,
      },
      include: {
        taskForce: true,
        user: true,
      },
    });
  }

  async listTaskForces() {
    return this.prisma.taskForce.findMany({
      include: {
        creator: true,
        volunteers: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getTaskForce(id: string) {
    return this.prisma.taskForce.findUnique({
      where: { id },
      include: {
        creator: true,
        volunteers: {
          include: {
            user: true,
          },
        },
      },
    });
  }
}
