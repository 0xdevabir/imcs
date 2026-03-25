import { Injectable, OnModuleInit } from '@nestjs/common';
import { hash, hashSync } from 'bcryptjs';

export type UserRecord = {
  userId: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
};

@Injectable()
export class UsersService implements OnModuleInit {
  private nextUserId = 2;
  private readonly users: UserRecord[];

  constructor() {
    const adminUsername = process.env.INIT_ADMIN_USERNAME ?? 'admin';
    const adminPassword = process.env.INIT_ADMIN_PASSWORD ?? 'Admin123!';

    this.users = [
      {
        userId: 1,
        username: adminUsername,
        password: hashSync(adminPassword, 12),
        role: 'admin',
      },
    ];
  }

  async onModuleInit() {
    const quickUsers = [
      { username: 'user1', password: 'User123!', role: 'user' as const },
      { username: 'user2', password: 'User123!', role: 'user' as const },
      { username: 'user3', password: 'User123!', role: 'user' as const },
      { username: 'user4', password: 'User123!', role: 'user' as const },
    ];

    for (const user of quickUsers) {
      if (!this.findOne(user.username)) {
        await this.createUser(user);
      }
    }
  }

  findOne(username: string): UserRecord | undefined {
    return this.users.find((user) => user.username === username);
  }

  findOneById(userId: number): UserRecord | undefined {
    return this.users.find((user) => user.userId === userId);
  }

  findSafeById(userId: number): Omit<UserRecord, 'password'> | undefined {
    const user = this.users.find((candidate) => candidate.userId === userId);
    if (!user) return undefined;

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  findAllSafe(): Array<Omit<UserRecord, 'password'>> {
    return this.users.map(({ password: _password, ...safeUser }) => safeUser);
  }

  async createUser(input: {
    username: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<Omit<UserRecord, 'password'>> {
    const user = {
      userId: this.nextUserId,
      username: input.username,
      password: await hash(input.password, 12),
      role: input.role ?? 'user',
    } satisfies UserRecord;

    this.nextUserId += 1;
    this.users.push(user);

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  updateRole(username: string, role: 'admin' | 'user') {
    const user = this.findOne(username);
    if (!user) {
      return undefined;
    }

    user.role = role;
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  deleteUser(username: string) {
    const index = this.users.findIndex((candidate) => candidate.username === username);
    if (index < 0) {
      return false;
    }

    this.users.splice(index, 1);
    return true;
  }

  searchUsers(query: string): Array<{ userId: number; username: string; role: 'admin' | 'user' }> {
    const lowerQuery = query.toLowerCase();
    return this.users
      .filter((user) => user.username.toLowerCase().includes(lowerQuery))
      .map(({ password: _password, ...safeUser }) => safeUser)
      .slice(0, 10);
  }

  findByUsername(username: string): { userId: number; username: string; role: 'admin' | 'user' } | undefined {
    const user = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return undefined;
    return { userId: user.userId, username: user.username, role: user.role };
  }
}
