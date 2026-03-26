import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _password, ...result } = user;
    return result;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    const payload = { username: user.username, sub: user.userId, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(username: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(username);
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    await this.usersService.updatePassword(username, newPassword);
    return { success: true };
  }
}
