import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async listRules() {
    return this.prisma.communicationRule.findMany({
      orderBy: [{ fromUsername: 'asc' }, { toUsername: 'asc' }],
    });
  }

  async setRule(input: {
    fromUsername: string;
    toUsername: string;
    allowed: boolean;
    bidirectional?: boolean;
  }) {
    const [from, to] = await Promise.all([
      this.usersService.findOne(input.fromUsername),
      this.usersService.findOne(input.toUsername),
    ]);

    if (!from || !to) {
      throw new NotFoundException('Both users must exist');
    }

    const bidirectional = input.bidirectional ?? true;

    const upsertOne = (fromUsername: string, toUsername: string) =>
      this.prisma.communicationRule.upsert({
        where: {
          fromUsername_toUsername: {
            fromUsername,
            toUsername,
          },
        },
        update: {
          allowed: input.allowed,
        },
        create: {
          fromUsername,
          toUsername,
          allowed: input.allowed,
        },
      });

    const first = await upsertOne(from.username, to.username);
    if (bidirectional) {
      await upsertOne(to.username, from.username);
    }

    return first;
  }

  async deleteRule(id: string) {
    await this.prisma.communicationRule.delete({ where: { id } });
    return { success: true };
  }

  async canUsersCommunicate(fromUsername: string, toUsername: string) {
    const direct = await this.prisma.communicationRule.findUnique({
      where: {
        fromUsername_toUsername: {
          fromUsername,
          toUsername,
        },
      },
      select: {
        allowed: true,
      },
    });

    if (direct) {
      return direct.allowed;
    }

    return true;
  }
}
