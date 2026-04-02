import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EventsGateway } from '../events/events.gateway';

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
  groupId: string | null;
  conversationId: string | null;
  name: string;
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

  private async ensureIdentifiersForRoom(input: {
    id: string;
    key: string;
    groupId: string | null;
    conversationId: string | null;
  }) {
    const isDirectRoom = input.key.startsWith('dm_');

    if (isDirectRoom && input.conversationId && !input.groupId) {
      return {
        groupId: input.groupId,
        conversationId: input.conversationId,
      };
    }

    if (!isDirectRoom && input.groupId && !input.conversationId) {
      return {
        groupId: input.groupId,
        conversationId: input.conversationId,
      };
    }

    return this.prisma.chatRoom.update({
      where: { id: input.id },
      data: isDirectRoom
        ? {
            conversationId: input.conversationId ?? `cnv_${randomUUID()}`,
            groupId: null,
          }
        : {
            groupId: input.groupId ?? `grp_${randomUUID()}`,
            conversationId: null,
          },
      select: {
        groupId: true,
        conversationId: true,
      },
    });
  }

  private extractPeerUserIdFromRoomKey(roomKey: string, viewerUserId: number): number | null {
    if (!roomKey.startsWith('dm_')) {
      return null;
    }

    const parts = roomKey.split('_');
    if (parts.length !== 3) {
      return null;
    }

    const first = Number(parts[1]);
    const second = Number(parts[2]);
    if (!Number.isInteger(first) || !Number.isInteger(second)) {
      return null;
    }

    if (first === viewerUserId) {
      return second;
    }

    if (second === viewerUserId) {
      return first;
    }

    return first;
  }

  private async resolveRoomDisplayNameForUser(input: {
    key: string;
    fallbackName: string | null;
    members: Array<{ userId: number; username: string }>;
    viewerUserId: number;
  }) {
    if (!input.key.startsWith('dm_')) {
      return input.fallbackName ?? input.key;
    }

    const other = input.members.find((member) => member.userId !== input.viewerUserId);
    if (other) {
      return other.username;
    }

    const peerUserId = this.extractPeerUserIdFromRoomKey(input.key, input.viewerUserId);
    if (peerUserId !== null) {
      const peer = await this.prisma.user.findUnique({
        where: { id: peerUserId },
        select: { username: true },
      });
      if (peer?.username) {
        return peer.username;
      }
    }

    return input.fallbackName ?? input.key;
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
    return this.eventsGateway.getSocketIdsForUser(userId);
  }

  async createGroup(input: {
    key: string;
    name?: string;
    participantUsernames?: string[];
    creator: RequestUser;
  }) {
    const key = this.normalizeKey(input.key);
    const isDirectRoom = key.startsWith('dm_');

    const existing = await this.prisma.chatRoom.findUnique({
      where: { key },
      include: {
        members: {
          orderBy: { username: 'asc' },
        },
      },
    });

    if (existing) {
      if (!isDirectRoom) {
        throw new ConflictException('Group key already exists');
      }

      const identifiers = await this.ensureIdentifiersForRoom({
        id: existing.id,
        key: existing.key,
        groupId: existing.groupId,
        conversationId: existing.conversationId,
      });

      return {
        key: existing.key,
        groupId: identifiers.groupId,
        conversationId: identifiers.conversationId,
        name: await this.resolveRoomDisplayNameForUser({
          key: existing.key,
          fallbackName: existing.name,
          members: existing.members,
          viewerUserId: input.creator.userId,
        }),
        ownerUserId: existing.ownerUserId,
        ownerUsername: existing.ownerUsername,
        participants: await Promise.all(existing.members.map((member) => this.toParticipantView(existing, member))),
      };
    }

    const trimmedName = input.name?.trim() ?? '';
    if (input.name !== undefined && trimmedName.length === 0) {
      throw new ConflictException('Group name cannot be empty or whitespace');
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
          name: trimmedName || key,
          ownerUserId: input.creator.userId,
          ownerUsername: input.creator.username,
          ...(isDirectRoom
            ? { conversationId: `cnv_${randomUUID()}` }
            : { groupId: `grp_${randomUUID()}` }),
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

    const groupPayloadBase = {
      key: created.key,
      groupId: created.groupId,
      conversationId: created.conversationId,
      ownerUserId: created.ownerUserId,
      ownerUsername: created.ownerUsername,
      participants: await Promise.all(created.members.map((member) => this.toParticipantView(created, member))),
    };

    if (isDirectRoom) {
      for (const member of created.members) {
        const personalized = {
          ...groupPayloadBase,
          name: await this.resolveRoomDisplayNameForUser({
            key: created.key,
            fallbackName: created.name,
            members: created.members,
            viewerUserId: member.userId,
          }),
        };
        this.emitGroupUpdate('group_created', personalized, [member.userId]);
      }
    } else {
      this.emitGroupUpdate('group_created', {
        ...groupPayloadBase,
        name: created.name,
      }, created.members.map((m) => m.userId));
    }

    return {
      ...groupPayloadBase,
      name: await this.resolveRoomDisplayNameForUser({
        key: created.key,
        fallbackName: created.name,
        members: created.members,
        viewerUserId: input.creator.userId,
      }),
    };
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

    return Promise.all(groups.map(async (group): Promise<GroupSummary> => {
      const identifiers = await this.ensureIdentifiersForRoom({
        id: group.id,
        key: group.key,
        groupId: group.groupId,
        conversationId: group.conversationId,
      });

      return {
        key: group.key,
        groupId: identifiers.groupId,
        conversationId: identifiers.conversationId,
        name: await this.resolveRoomDisplayNameForUser({
          key: group.key,
          fallbackName: group.name,
          members: group.members,
          viewerUserId: user.userId,
        }),
        ownerUserId: group.ownerUserId,
        ownerUsername: group.ownerUsername,
        participantCount: group.members.length,
        participants: group.members,
      };
    }));
  }

  async getGroupByKey(roomKey: string, user: RequestUser) {
    const group = await this.assertMemberOrAdmin(this.normalizeKey(roomKey), user);
    const identifiers = await this.ensureIdentifiersForRoom({
      id: group.id,
      key: group.key,
      groupId: group.groupId,
      conversationId: group.conversationId,
    });

    return {
      key: group.key,
      groupId: identifiers.groupId,
      conversationId: identifiers.conversationId,
      name: await this.resolveRoomDisplayNameForUser({
        key: group.key,
        fallbackName: group.name,
        members: group.members,
        viewerUserId: user.userId,
      }),
      ownerUserId: group.ownerUserId,
      ownerUsername: group.ownerUsername,
      participantCount: group.members.length,
      participants: group.members,
    };
  }

  async getParticipants(roomKey: string, user: RequestUser) {
    const group = await this.assertMemberOrAdmin(this.normalizeKey(roomKey), user);
    const identifiers = await this.ensureIdentifiersForRoom({
      id: group.id,
      key: group.key,
      groupId: group.groupId,
      conversationId: group.conversationId,
    });

    return {
      group: {
        key: group.key,
        groupId: identifiers.groupId,
        conversationId: identifiers.conversationId,
        name: await this.resolveRoomDisplayNameForUser({
          key: group.key,
          fallbackName: group.name,
          members: group.members,
          viewerUserId: user.userId,
        }),
        ownerUserId: group.ownerUserId,
        ownerUsername: group.ownerUsername,
      },
      participants: await Promise.all(group.members.map((member) => this.toParticipantView(group, member))),
      canManageMembers: user.role === 'admin' || group.ownerUserId === user.userId,
    };
  }

  async addUserToGroup(input: { roomKey: string; username: string; actor: RequestUser }) {
    const group = await this.assertCanManageMembers(this.normalizeKey(input.roomKey), input.actor);
    const identifiers = await this.ensureIdentifiersForRoom({
      id: group.id,
      key: group.key,
      groupId: group.groupId,
      conversationId: group.conversationId,
    });

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

    const allMemberIds = [...group.members.map((m) => m.userId), user.userId];
    this.emitGroupUpdate('group_member_added', {
      key: group.key,
      groupId: identifiers.groupId,
      conversationId: identifiers.conversationId,
      name: group.name,
      addedUser: user.username,
    }, allMemberIds);

    const server = this.eventsGateway.server;
    if (server) {
      for (const socketId of this.getSocketIdsForUser(user.userId)) {
        server.in(socketId).socketsJoin(group.key);
      }
    }

    return result;
  }

  async removeUserFromGroup(input: { roomKey: string; username: string; actor: RequestUser }) {
    const group = await this.assertCanManageMembers(this.normalizeKey(input.roomKey), input.actor);
    const identifiers = await this.ensureIdentifiersForRoom({
      id: group.id,
      key: group.key,
      groupId: group.groupId,
      conversationId: group.conversationId,
    });

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
      groupId: identifiers.groupId,
      conversationId: identifiers.conversationId,
      removedUser: user.username,
    }, group.members.map((m) => m.userId));

    return result;
  }
}
