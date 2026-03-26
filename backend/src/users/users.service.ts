import { Injectable, OnModuleInit } from '@nestjs/common';
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
    const adminUsername = process.env.INIT_ADMIN_USERNAME ?? 'admin';
    const adminPassword = process.env.INIT_ADMIN_PASSWORD ?? 'Admin123!';

    await this.ensureUser({ username: adminUsername, password: adminPassword, role: 'admin' });

    const quickUsers = [
      { username: 'user1', password: 'User123!', role: 'user' as const },
      { username: 'user2', password: 'User123!', role: 'user' as const },
      { username: 'user3', password: 'User123!', role: 'user' as const },
      { username: 'user4', password: 'User123!', role: 'user' as const },
    ];

    for (const user of quickUsers) {
      await this.ensureUser(user);
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
    password: string;
    role?: 'admin' | 'user';
  }): Promise<Omit<UserRecord, 'password'>> {
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        password: await hash(input.password, 12),
        role: input.role ?? 'user',
      },
    });

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

    await this.prisma.user.delete({ where: { id: existing.id } });
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
}
