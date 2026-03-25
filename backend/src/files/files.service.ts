import { Injectable } from '@nestjs/common';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type RequestLike = { protocol: string; get(name: string): string | undefined };

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  getUploadDirectory(): string {
    return resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'storage/uploads');
  }

  getMaxUploadSizeBytes(): number {
    const maxMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10);
    return Math.max(1, maxMb) * 1024 * 1024;
  }

  toPublicUrl(request: RequestLike, fileName: string): string {
    const host = request.get('host') ?? 'localhost:3001';
    return `${request.protocol}://${host}/files/${fileName}`;
  }

  toDownloadUrl(request: RequestLike, fileId: string): string {
    const host = request.get('host') ?? 'localhost:3001';
    return `${request.protocol}://${host}/files/${fileId}/download`;
  }

  async createPrivateFileRecord(input: {
    roomKey: string;
    uploaderUserId: number;
    uploaderName: string;
    storedName: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }) {
    const room = await this.prisma.chatRoom.findUnique({ where: { key: input.roomKey } });
    if (!room) {
      return null;
    }

    return this.prisma.uploadedFile.create({
      data: {
        roomId: room.id,
        uploaderUserId: input.uploaderUserId,
        uploaderName: input.uploaderName,
        storedName: input.storedName,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        storagePath: input.storagePath,
      },
    });
  }

  async canUploadToRoom(input: { roomKey: string; userId: number; role: 'admin' | 'user' }) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { key: input.roomKey },
      select: { id: true },
    });

    if (!room) {
      return false;
    }

    if (input.role === 'admin') {
      return true;
    }

    const membership = await this.prisma.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: input.userId,
        },
      },
      select: { id: true },
    });

    return Boolean(membership);
  }

  async canAccessFile(input: { fileId: string; userId: number; role: 'admin' | 'user' }) {
    const file = await this.prisma.uploadedFile.findUnique({
      where: { id: input.fileId },
      include: {
        room: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!file) {
      return null;
    }

    if (input.role === 'admin' || file.uploaderUserId === input.userId) {
      return file;
    }

    const membership = await this.prisma.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: file.room.id,
          userId: input.userId,
        },
      },
      select: { id: true },
    });

    return membership ? file : null;
  }
}
