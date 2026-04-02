import { BadRequestException, Body, Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EventsGateway } from '../events/events.gateway';
import { UsersService } from '../users/users.service';

function resolveSameSite() {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();
  if (sameSite === 'strict' || sameSite === 'none' || sameSite === 'lax') {
    return sameSite;
  }
  return 'lax';
}

function buildProfilePictureUrl(
  request: { protocol: string; get: (name: string) => string | undefined },
  fileName: string | null,
): string | null {
  if (!fileName) return null;
  const host = request.get('host') ?? 'localhost:3001';
  const protocol = request.protocol ?? 'http';
  return `${protocol}://${host}/files/${fileName}`;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly eventsGateway: EventsGateway,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @Post('quick-login')
  async quickLogin(@Body() body: { username: string }) {
    if (!body.username?.trim()) throw new BadRequestException('username is required');
    return this.authService.quickLogin(body.username.trim());
  }

  @Post('force-login')
  async forceLogin(@Body() body: { username: string }) {
    if (!body.username?.trim()) throw new BadRequestException('username is required');
    const user = await this.usersService.findOne(body.username.trim());
    if (user) {
      // Disconnect any active sockets for this user before issuing the new token
      this.eventsGateway.kickUser(user.userId);
    }
    return this.authService.forceLogin(body.username.trim());
  }

  @Post('logout')
  async logout(
    @Body() body: { username?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    if (body.username) {
      const user = await this.usersService.findOne(body.username);
      if (user) await this.authService.logoutUser(user.userId);
    }
    const sameSite = resolveSameSite();
    const secure = process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' || sameSite === 'none';
    response.clearCookie(process.env.AUTH_COOKIE_NAME ?? 'imcs_auth', { path: '/', sameSite, secure });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @Request() request: {
      user: { userId: number; username: string; role: 'admin' | 'user' };
      protocol: string;
      get: (name: string) => string | undefined;
    },
  ) {
    const profilePicFileName = await this.usersService.getProfilePicture(request.user.userId);
    return {
      ...request.user,
      profilePicture: buildProfilePictureUrl(request, profilePicFileName),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Request() request: { user: { username: string } },
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.user.username, body.currentPassword, body.newPassword);
  }
}
