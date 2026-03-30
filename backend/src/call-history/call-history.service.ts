import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RequestUser = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

@Injectable()
export class CallHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async saveCallHistory(user: RequestUser, data: {
    peerUserId: number;
    peerUsername: string;
    callType: string;
    callStatus: string;
    duration: number;
    roomKey: string;
  }) {
    return this.prisma.callHistory.create({
      data: {
        userId: user.userId,
        peerUserId: data.peerUserId,
        peerUsername: data.peerUsername,
        callType: data.callType,
        callStatus: data.callStatus,
        duration: data.duration,
        roomKey: data.roomKey,
      },
    });
  }

  async getCallHistory(user: RequestUser, limit = 50) {
    return this.prisma.callHistory.findMany({
      where: {
        userId: user.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async deleteCallHistory(user: RequestUser, id: string) {
    return this.prisma.callHistory.deleteMany({
      where: {
        id,
        userId: user.userId,
      },
    });
  }

  async clearCallHistory(user: RequestUser) {
    return this.prisma.callHistory.deleteMany({
      where: {
        userId: user.userId,
      },
    });
  }
}
