import { Injectable } from '@nestjs/common';

export type UserRecord = {
  userId: number;
  username: string;
  password: string;
};

@Injectable()
export class UsersService {
  private readonly users: UserRecord[] = [
    {
      userId: 1,
      username: 'admin',
      password: 'admin123',
    },
  ];

  findOne(username: string): UserRecord | undefined {
    return this.users.find((user) => user.username === username);
  }
}
