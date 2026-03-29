import { Injectable } from '@nestjs/common';
import { ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Sender = {
  userId: number;
  username: string;
};

type ReplyPreview = {
  id: string;
  senderUsername: string;
  content: string;
};

type MessageReactionView = {
  id: string;
  messageId: string;
  userId: number;
  username: string;
  emoji: string;
  createdAt: Date;
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapMessage(
    row: {
      id: string;
      content: string;
      isEdited: boolean;
      isDeleted: boolean;
      room: { key: string };
      senderUserId: number;
      senderUsername: string;
      createdAt: Date;
      deliveredAt: Date | null;
      readAt: Date | null;
      receipts: Array<{
        id: string;
        messageId: string;
        userId: number;
        username: string;
        status: ReceiptStatus;
        createdAt: Date;
      }>;
      reactions: MessageReactionView[];
      replyTo: null | {
        id: string;
        senderUsername: string;
        content: string;
      };
    },
  ) {
    return {
      id: row.id,
      roomKey: row.room.key,
      sender: {
        userId: row.senderUserId,
        username: row.senderUsername,
      },
      content: row.content,
      isEdited: row.isEdited,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      receipts: row.receipts,
      reactions: row.reactions,
      replyTo: row.replyTo,
    };
  }

  async ensureRoom(roomKey: string, roomName?: string) {
    return this.prisma.chatRoom.upsert({
      where: { key: roomKey },
      update: {
        name: roomName ?? undefined,
      },
      create: {
        key: roomKey,
        name: roomName,
      },
    });
  }

  async getRoomByKey(roomKey: string) {
    return this.prisma.chatRoom.findUnique({
      where: { key: roomKey },
    });
  }

  async getRoomParticipantUsernames(roomKey: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { key: roomKey },
      include: {
        members: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!room) {
      return [];
    }

    return room.members.map((member) => member.username);
  }

  async ensureRoomMembership(input: { roomKey: string; roomName?: string; user: Sender }) {
    const room = await this.ensureRoom(input.roomKey, input.roomName);

    await this.prisma.chatRoomMember.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: input.user.userId,
        },
      },
      update: {
        username: input.user.username,
      },
      create: {
        roomId: room.id,
        userId: input.user.userId,
        username: input.user.username,
      },
    });

    return room;
  }

  async userHasRoomAccess(input: { roomKey: string; userId: number }) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { key: input.roomKey },
      select: { id: true },
    });

    if (!room) {
      return false;
    }

    const member = await this.prisma.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: input.userId,
        },
      },
      select: { id: true },
    });

    return Boolean(member);
  }

  async getRoomKeysForUser(userId: number): Promise<string[]> {
    const memberships = await this.prisma.chatRoomMember.findMany({
      where: { userId },
      select: { room: { select: { key: true } } },
    });
    return memberships.map((m) => m.room.key);
  }

  async getRecentMessages(roomKey: string, limit = 50) {
    const room = await this.prisma.chatRoom.findUnique({ where: { key: roomKey } });
    if (!room) {
      return [];
    }

    const rows = await this.prisma.chatMessage.findMany({
      where: { roomId: room.id },
      include: {
        receipts: true,
        reactions: true,
        replyTo: {
          select: {
            id: true,
            senderUsername: true,
            content: true,
          },
        },
        room: {
          select: {
            key: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return rows.map((row) => this.mapMessage(row));
  }

  async createMessage(input: {
    roomKey: string;
    content: string;
    sender: Sender;
    replyToMessageId?: string;
  }) {
    const room = await this.ensureRoomMembership({
      roomKey: input.roomKey,
      user: input.sender,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      let replyTo: ReplyPreview | null = null;
      if (input.replyToMessageId) {
        const referenced = await tx.chatMessage.findFirst({
          where: {
            id: input.replyToMessageId,
            roomId: room.id,
          },
          select: {
            id: true,
            senderUsername: true,
            content: true,
          },
        });
        replyTo = referenced;
      }

      const message = await tx.chatMessage.create({
        data: {
          roomId: room.id,
          senderUserId: input.sender.userId,
          senderUsername: input.sender.username,
          content: input.content,
          replyToMessageId: replyTo?.id,
        },
      });

      await tx.messageReceipt.createMany({
        data: [
          {
            messageId: message.id,
            userId: input.sender.userId,
            username: input.sender.username,
            status: ReceiptStatus.DELIVERED,
          },
          {
            messageId: message.id,
            userId: input.sender.userId,
            username: input.sender.username,
            status: ReceiptStatus.READ,
          },
        ],
      });

      await tx.chatMessage.update({
        where: { id: message.id },
        data: {
          deliveredAt: new Date(),
          readAt: new Date(),
        },
      });

      return tx.chatMessage.findUniqueOrThrow({
        where: { id: message.id },
        include: {
          receipts: true,
          reactions: true,
          replyTo: {
            select: {
              id: true,
              senderUsername: true,
              content: true,
            },
          },
          room: {
            select: {
              key: true,
            },
          },
        },
      });
    });

    return this.mapMessage(created);
  }

  async acknowledgeReceipt(input: {
    messageId: string;
    status: 'DELIVERED' | 'READ';
    user: Sender;
  }) {
    const status = input.status === 'READ' ? ReceiptStatus.READ : ReceiptStatus.DELIVERED;

    const receipt = await this.prisma.messageReceipt.upsert({
      where: {
        messageId_userId_status: {
          messageId: input.messageId,
          userId: input.user.userId,
          status,
        },
      },
      update: {},
      create: {
        messageId: input.messageId,
        userId: input.user.userId,
        username: input.user.username,
        status,
      },
      include: {
        message: {
          include: {
            room: true,
          },
        },
      },
    });

    if (status === ReceiptStatus.DELIVERED) {
      await this.prisma.chatMessage.updateMany({
        where: {
          id: input.messageId,
          deliveredAt: null,
        },
        data: {
          deliveredAt: new Date(),
        },
      });
    }

    if (status === ReceiptStatus.READ) {
      await this.prisma.chatMessage.updateMany({
        where: {
          id: input.messageId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    }

    return {
      messageId: receipt.messageId,
      roomKey: receipt.message.room.key,
      userId: receipt.userId,
      username: receipt.username,
      status: receipt.status,
      createdAt: receipt.createdAt,
    };
  }

  async editMessage(input: { messageId: string; content: string; userId: number }) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: input.messageId },
      include: { room: { select: { key: true } } },
    });

    if (!message || message.senderUserId !== input.userId || message.isDeleted) {
      return null;
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: input.messageId },
      data: { content: input.content, isEdited: true },
      include: { room: { select: { key: true } } },
    });

    return { id: updated.id, content: updated.content, roomKey: updated.room.key };
  }

  async deleteMessage(input: { messageId: string; userId: number; role: string }) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: input.messageId },
      include: { room: { select: { key: true } } },
    });

    if (!message) return null;
    if (message.senderUserId !== input.userId && input.role !== 'admin') return null;

    await this.prisma.chatMessage.update({
      where: { id: input.messageId },
      data: { isDeleted: true, content: 'This message was deleted.' },
    });

    return { roomKey: message.room.key };
  }

  async toggleReaction(input: { messageId: string; emoji: string; user: Sender }) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: input.messageId },
      include: {
        room: {
          select: {
            key: true,
            id: true,
          },
        },
      },
    });

    if (!message) {
      return null;
    }

    const membership = await this.prisma.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: message.room.id,
          userId: input.user.userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return null;
    }

    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: input.messageId,
          userId: input.user.userId,
          emoji: input.emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.messageReaction.create({
        data: {
          messageId: input.messageId,
          userId: input.user.userId,
          username: input.user.username,
          emoji: input.emoji,
        },
      });
    }

    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId: input.messageId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      roomKey: message.room.key,
      messageId: input.messageId,
      reactions,
    };
  }
}
