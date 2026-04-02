import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export type UserRecord = {
  userId: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureUser({ username: 'ABIR', password: 'Prototype1!', role: 'admin' });
    await this.cleanupInvalidMessagingState();
  }

  private async cleanupInvalidMessagingState() {
    const contacts = await this.prisma.userContact.findMany({
      select: { id: true, userId: true, contactId: true },
    });
    const selfContactIds = contacts
      .filter((contact) => contact.userId === contact.contactId)
      .map((contact) => contact.id);
    if (selfContactIds.length > 0) {
      await this.prisma.userContact.deleteMany({
        where: { id: { in: selfContactIds } },
      });
    }

    const dmRooms = await this.prisma.chatRoom.findMany({
      where: { key: { startsWith: 'dm_' } },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });
    const invalidDmRoomIds = dmRooms
      .filter((room) => new Set(room.members.map((member) => member.userId)).size !== 2)
      .map((room) => room.id);
    if (invalidDmRoomIds.length > 0) {
      await this.prisma.chatRoom.deleteMany({
        where: { id: { in: invalidDmRoomIds } },
      });
    }
  }

  private toUserRecord(user: { id: number; username: string; password: string; role: 'admin' | 'user' }): UserRecord {
    return {
      userId: user.id,
      username: user.username,
      password: user.password,
      role: user.role,
    };
  }

  private async ensureUser(input: { username: string; password: string; role: 'admin' | 'user' }) {
    const existing = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (existing) return;

    await this.prisma.user.create({
      data: {
        username: input.username,
        password: await hash(input.password, 12),
        role: input.role,
      },
    });
  }

  async findOne(username: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? this.toUserRecord(user) : undefined;
  }

  async findOneById(userId: number): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toUserRecord(user) : undefined;
  }

  async findSafeById(userId: number): Promise<Omit<UserRecord, 'password'> | undefined> {
    const user = await this.findOneById(userId);
    if (!user) return undefined;

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async findAllSafe(): Promise<Array<Omit<UserRecord, 'password'>>> {
    const users = await this.prisma.user.findMany({
      select: { id: true, username: true, role: true },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => ({ userId: user.id, username: user.username, role: user.role }));
  }

  async createUser(input: {
    username: string;
    password?: string;
    role?: 'admin' | 'user';
  }): Promise<Omit<UserRecord, 'password'>> {
    const existingUsers = await this.prisma.user.findMany({ select: { id: true } });

    const password = input.password ?? randomBytes(24).toString('base64');

    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        password: await hash(password, 12),
        role: input.role ?? 'user',
      },
    });

    // Auto-add new user to all existing users' contacts (bidirectional)
    if (existingUsers.length > 0) {
      await this.prisma.userContact.createMany({
        data: [
          ...existingUsers.map((e) => ({ userId: e.id, contactId: user.id })),
          ...existingUsers.map((e) => ({ userId: user.id, contactId: e.id })),
        ],
        skipDuplicates: true,
      });
    }

    const { password: _password, ...safeUser } = this.toUserRecord(user);
    return safeUser;
  }

  async updateRole(username: string, role: 'admin' | 'user') {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) return undefined;

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: { role },
    });

    const { password: _password, ...safeUser } = this.toUserRecord(updated);
    return safeUser;
  }

  async deleteUser(username: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) return false;

    const userId = existing.id;

    await this.prisma.$transaction(async (tx) => {
      // Remove from contacts (both directions)
      await tx.userContact.deleteMany({ where: { OR: [{ userId }, { contactId: userId }] } });

      // Remove communication rules
      await tx.communicationRule.deleteMany({
        where: { OR: [{ fromUsername: username }, { toUsername: username }] },
      });

      // Delete message receipts by this user
      await tx.messageReceipt.deleteMany({ where: { userId } });

      // Delete reactions by this user
      await tx.messageReaction.deleteMany({ where: { userId } });

      // Delete uploaded file records by this user
      await tx.uploadedFile.deleteMany({ where: { uploaderUserId: userId } });

      // Delete messages sent by this user (cascades receipts/reactions on those messages)
      await tx.chatMessage.deleteMany({ where: { senderUserId: userId } });

      // Find all rooms where this user is a member
      const memberships = await tx.chatRoomMember.findMany({
        where: { userId },
        select: { roomId: true },
      });
      const roomIds = memberships.map((m) => m.roomId);

      // Delete DM rooms (cascade deletes all messages, files, members, receipts, reactions)
      if (roomIds.length > 0) {
        await tx.chatRoom.deleteMany({
          where: { id: { in: roomIds }, key: { startsWith: 'dm_' } },
        });
      }

      // Remove user from group room memberships
      await tx.chatRoomMember.deleteMany({ where: { userId } });

      // Delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    return true;
  }

  async searchUsers(query: string): Promise<Array<{ userId: number; username: string; role: 'admin' | 'user' }>> {
    const users = await this.prisma.user.findMany({
      where: { username: { contains: query, mode: 'insensitive' } },
      select: { id: true, username: true, role: true },
      take: 10,
      orderBy: { username: 'asc' },
    });

    return users.map((user) => ({ userId: user.id, username: user.username, role: user.role }));
  }

  async findByUsername(
    username: string,
  ): Promise<{ userId: number; username: string; role: 'admin' | 'user' } | undefined> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, role: true },
    });
    if (!user) return undefined;
    return { userId: user.id, username: user.username, role: user.role };
  }

  async updatePassword(username: string, newPassword: string): Promise<boolean> {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) return false;

    await this.prisma.user.update({
      where: { id: existing.id },
      data: { password: await hash(newPassword, 12) },
    });
    return true;
  }

  async getContacts(userId: number): Promise<Array<{ userId: number; username: string; role: 'admin' | 'user' }>> {
    const contacts = await this.prisma.userContact.findMany({ where: { userId }, select: { contactId: true } });
    if (contacts.length === 0) return [];
    const contactIds = [...new Set(contacts.map((c) => c.contactId).filter((contactId) => contactId !== userId))];
    if (contactIds.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, username: true, role: true },
      orderBy: { username: 'asc' },
    });
    return users.map((u) => ({ userId: u.id, username: u.username, role: u.role }));
  }

  async addContact(userId: number, contactId: number): Promise<{ success: boolean; message?: string }> {
    if (userId === contactId) return { success: false, message: 'Cannot add yourself' };
    const contact = await this.prisma.user.findUnique({ where: { id: contactId } });
    if (!contact) return { success: false, message: 'User not found' };
    try {
      await this.prisma.userContact.create({ data: { userId, contactId } });
      return { success: true };
    } catch {
      return { success: false, message: 'Already in contacts' };
    }
  }

  async removeContact(userId: number, contactId: number): Promise<boolean> {
    const result = await this.prisma.userContact.deleteMany({ where: { userId, contactId } });
    return result.count > 0;
  }

  async setSession(userId: number, jti: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionJti: jti, sessionCreatedAt: new Date() },
    });
  }

  async clearSession(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionJti: null, sessionCreatedAt: null },
    });
  }

  async getActiveSession(userId: number): Promise<{ jti: string; createdAt: Date } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionJti: true, sessionCreatedAt: true },
    });
    if (!user?.sessionJti || !user.sessionCreatedAt) return null;
    return { jti: user.sessionJti, createdAt: user.sessionCreatedAt };
  }

  async updateUsername(userId: number, newUsername: string): Promise<{ success: boolean; username?: string; message?: string }> {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 32) {
      return { success: false, message: 'Username must be 2–32 characters.' };
    }
    const existing = await this.prisma.user.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== userId) {
      return { success: false, message: 'Username is already taken.' };
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { username: trimmed },
    });
    return { success: true, username: updated.username };
  }
}
