import { Injectable } from '@nestjs/common';
import { hash, hashSync } from 'bcryptjs';

export type UserRecord = {
  userId: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
};

@Injectable()
export class UsersService {
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

  findOne(username: string): UserRecord | undefined {
    return this.users.find((user) => user.username === username);
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
}
