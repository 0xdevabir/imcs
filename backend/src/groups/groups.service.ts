import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EventsGateway } from '../events/events.gateway';
import { Server } from 'socket.io';

type RequestUser = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

type ParticipantView = {
  id: string;
  roomId: string;
  userId: number;
  username: string;
  joinedAt: Date;
  updatedAt: Date;
  role: 'owner' | 'admin' | 'member';
};

type GroupSummary = {
  key: string;
  name: string | null;
  ownerUserId: number | null;
  ownerUsername: string | null;
  participantCount: number;
  participants: { userId: number; username: string }[];
};

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private normalizeKey(input: string): string {
    return input.trim().toLowerCase();
  }

  private async resolveUserIdentity(username: string) {
    const normalized = username.trim();
    if (!normalized) {
      return null;
    }

    const liveUser = await this.usersService.findOne(normalized);
    if (liveUser) {
      return {
        userId: liveUser.userId,
        username: liveUser.username,
      };
    }

    const fromMembership = await this.prisma.chatRoomMember.findFirst({
      where: {
        username: normalized,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        userId: true,
        username: true,
      },
    });

    return fromMembership;
  }

  private async assertMemberOrAdmin(roomKey: string, user: RequestUser) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { key: roomKey },
      include: {
        members: {
          orderBy: { username: 'asc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Group not found');
    }

    const isMember = room.members.some((member) => member.userId === user.userId);
    if (!isMember && user.role !== 'admin') {
      throw new ForbiddenException('You are not a member of this group');
    }

    return room;
  }

  private async assertCanManageMembers(roomKey: string, user: RequestUser) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { key: roomKey },
      include: {
        members: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Group not found');
    }

    const canManage = user.role === 'admin' || room.ownerUserId === user.userId;
    if (!canManage) {
      throw new ForbiddenException('Only group owner or admin can manage members');
    }

    return room;
  }

  private async toParticipantView(
    group: { ownerUserId: number | null },
    member: {
      id: string;
      roomId: string;
      userId: number;
      username: string;
      joinedAt: Date;
      updatedAt: Date;
    },
  ): Promise<ParticipantView> {
    if (group.ownerUserId === member.userId) {
      return {
        ...member,
        role: 'owner',
      };
    }

    const knownUser = await this.usersService.findOne(member.username);
    if (knownUser?.role === 'admin') {
      return {
        ...member,
        role: 'admin',
      };
    }

    return {
      ...member,
      role: 'member',
    };
  }

  async createGroup(input: {
    key: string;
    name?: string;
    participantUsernames?: string[];
    creator: RequestUser;
  }) {
    const key = this.normalizeKey(input.key);

    const existing = await this.prisma.chatRoom.findUnique({ where: { key } });
    if (existing) {
      throw new ConflictException('Group key already exists');
    }

    const participantUsernames = Array.from(
      new Set((input.participantUsernames ?? []).map((name) => name.trim()).filter(Boolean)),
    );

    const usersToAdd = (
      await Promise.all(
        participantUsernames.map(async (username) => {
          const found = await this.resolveUserIdentity(username);
          if (!found) {
            throw new NotFoundException(`User ${username} was not found`);
          }

          return found;
        }),
      )
    ).filter((candidate) => candidate.userId !== input.creator.userId);

    const created = await this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: {
          key,
          name: input.name?.trim() || key,
          ownerUserId: input.creator.userId,
          ownerUsername: input.creator.username,
        },
      });

      await tx.chatRoomMember.create({
        data: {
          roomId: room.id,
          userId: input.creator.userId,
          username: input.creator.username,
        },
      });

      if (usersToAdd.length > 0) {
        await tx.chatRoomMember.createMany({
          data: usersToAdd.map((user) => ({
            roomId: room.id,
            userId: user.userId,
            username: user.username,
          })),
          skipDuplicates: true,
        });
      }

      return tx.chatRoom.findUniqueOrThrow({
        where: { id: room.id },
        include: {
          members: {
            orderBy: { username: 'asc' },
          },
        },
      });
    });

    const groupPayload = {
      key: created.key,
      name: created.name,
      ownerUserId: created.ownerUserId,
      ownerUsername: created.ownerUsername,
      participants: await Promise.all(created.members.map((member) => this.toParticipantView(created, member))),
    };

    this.emitGroupUpdate('group_created', groupPayload, created.members.map(m => m.userId));

    return groupPayload;
  }

  private emitGroupUpdate(event: string, data: unknown, userIds: number[]) {
    const server = this.eventsGateway.server;
    if (!server) return;

    for (const userId of userIds) {
      const socketIds = this.getSocketIdsForUser(userId);
      for (const socketId of socketIds) {
        server.to(socketId).emit(event, data);
      }
    }
  }

  private getSocketIdsForUser(userId: number): string[] {
    const socketsByUserId = (this.eventsGateway as unknown as { socketsByUserId: Map<number, Set<string>> }).socketsByUserId;
    const socketIds = socketsByUserId?.get(userId);
    return socketIds ? [...socketIds] : [];
  }

  async listGroupsForUser(user: RequestUser) {
    const groups = await this.prisma.chatRoom.findMany({
      where:
        user.role === 'admin'
          ? undefined
          : {
              members: {
                some: {
                  userId: user.userId,
                },
              },
            },
      include: {
        members: {
          orderBy: { username: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return groups.map((group) => ({
      key: group.key,
      name: group.name,
      ownerUserId: group.ownerUserId,
      ownerUsername: group.ownerUsername,
      participantCount: group.members.length,
      participants: group.members,
    }));
  }

  async getParticipants(roomKey: string, user: RequestUser) {
    const group = await this.assertMemberOrAdmin(this.normalizeKey(roomKey), user);

    return {
      group: {
        key: group.key,
        name: group.name,
        ownerUserId: group.ownerUserId,
        ownerUsername: group.ownerUsername,
      },
      participants: await Promise.all(group.members.map((member) => this.toParticipantView(group, member))),
      canManageMembers: user.role === 'admin' || group.ownerUserId === user.userId,
    };
  }

  async addUserToGroup(input: { roomKey: string; username: string; actor: RequestUser }) {
    const group = await this.assertCanManageMembers(this.normalizeKey(input.roomKey), input.actor);

    const user = await this.resolveUserIdentity(input.username.trim());
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.chatRoomMember.upsert({
      where: {
        roomId_userId: {
          roomId: group.id,
          userId: user.userId,
        },
      },
      update: {
        username: user.username,
      },
      create: {
        roomId: group.id,
        userId: user.userId,
        username: user.username,
      },
    });

    const result = await this.getParticipants(group.key, input.actor);
    
    const allMemberIds = [...group.members.map(m => m.userId), user.userId];
    this.emitGroupUpdate('group_member_added', { 
      key: group.key, 
      name: group.name,
      addedUser: user.username 
    }, allMemberIds);

    return result;
  }

  async removeUserFromGroup(input: { roomKey: string; username: string; actor: RequestUser }) {
    const group = await this.assertCanManageMembers(this.normalizeKey(input.roomKey), input.actor);

    const user = await this.resolveUserIdentity(input.username.trim());
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (group.ownerUserId === user.userId) {
      throw new ForbiddenException('Group owner cannot be removed');
    }

    await this.prisma.chatRoomMember.deleteMany({
      where: {
        roomId: group.id,
        userId: user.userId,
      },
    });

    const result = await this.getParticipants(group.key, input.actor);

    this.emitGroupUpdate('group_member_removed', { 
      key: group.key, 
      removedUser: user.username 
    }, group.members.map(m => m.userId));

    return result;
  }
}
