import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
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

  /** Returns a token or a conflict flag if the user already has an active session */
  async quickLogin(username: string): Promise<
    | { conflict: false; access_token: string }
    | { conflict: true }
  > {
    const user = await this.usersService.findOne(username);
    if (!user) throw new UnauthorizedException('User not found');

    const session = await this.usersService.getActiveSession(user.userId);
    if (session) {
      const expiryMs = this.jwtExpiryMs();
      const isExpired = Date.now() - session.createdAt.getTime() > expiryMs;
      if (!isExpired) {
        return { conflict: true };
      }
      // Session token expired — auto-clear and allow fresh login
      await this.usersService.clearSession(user.userId);
    }

    const jti = randomUUID();
    await this.usersService.setSession(user.userId, jti);
    const payload = { username: user.username, sub: user.userId, role: user.role, jti };
    return { conflict: false, access_token: this.jwtService.sign(payload) };
  }

  /** Force-login: replaces any existing session and returns a new token */
  async forceLogin(username: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username);
    if (!user) throw new UnauthorizedException('User not found');

    const jti = randomUUID();
    await this.usersService.setSession(user.userId, jti);
    const payload = { username: user.username, sub: user.userId, role: user.role, jti };
    return { access_token: this.jwtService.sign(payload) };
  }

  async logoutUser(userId: number): Promise<void> {
    await this.usersService.clearSession(userId);
  }

  async changePassword(username: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(username);
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    await this.usersService.updatePassword(username, newPassword);
    return { success: true };
  }

  private jwtExpiryMs(): number {
    const raw = process.env.JWT_EXPIRES_IN ?? '1h';
    const m = raw.match(/^(\d+)(s|m|h|d)$/);
    if (!m) return 3_600_000;
    const n = parseInt(m[1]);
    const units: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * units[m[2]];
  }
}
