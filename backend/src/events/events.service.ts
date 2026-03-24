import { Injectable } from '@nestjs/common';
import { ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Sender = {
  userId: number;
  username: string;
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getRecentMessages(roomKey: string, limit = 50) {
    const room = await this.prisma.chatRoom.findUnique({ where: { key: roomKey } });
    if (!room) {
      return [];
    }

    const rows = await this.prisma.chatMessage.findMany({
      where: { roomId: room.id },
      include: {
        receipts: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      roomKey,
      sender: {
        userId: row.senderUserId,
        username: row.senderUsername,
      },
      content: row.content,
      createdAt: row.createdAt,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      receipts: row.receipts,
    }));
  }

  async createMessage(input: { roomKey: string; content: string; sender: Sender }) {
    const room = await this.ensureRoom(input.roomKey);

    const created = await this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          roomId: room.id,
          senderUserId: input.sender.userId,
          senderUsername: input.sender.username,
          content: input.content,
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
        include: { receipts: true },
      });
    });

    return {
      id: created.id,
      roomKey: input.roomKey,
      sender: {
        userId: created.senderUserId,
        username: created.senderUsername,
      },
      content: created.content,
      createdAt: created.createdAt,
      deliveredAt: created.deliveredAt,
      readAt: created.readAt,
      receipts: created.receipts,
    };
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
}
